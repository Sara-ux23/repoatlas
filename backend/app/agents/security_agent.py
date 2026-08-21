"""Security Agent — scans repo like a pen tester."""

import os, asyncio, warnings, certifi
warnings.filterwarnings("ignore")
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
os.environ["SSL_CERT_FILE"] = certifi.where()

from langchain_core.messages import HumanMessage, SystemMessage
from app.tools.github_tools import clone_repo, cleanup_repo
from app.tools.security_tools import scan_secrets, scan_vulnerabilities, scan_sensitive_files, scan_dependencies, scan_misconfigurations
from app.core.llm import invoke_with_rotation

SEV = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}


def _scan(local_path: str) -> dict:
    return {
        "secrets": scan_secrets.invoke({"repo_path": local_path}),
        "vulnerabilities": scan_vulnerabilities.invoke({"repo_path": local_path}),
        "sensitive_files": scan_sensitive_files.invoke({"repo_path": local_path}),
        "dependencies": scan_dependencies.invoke({"repo_path": local_path}),
        "misconfigurations": scan_misconfigurations.invoke({"repo_path": local_path}),
    }


def _score(findings: dict) -> dict:
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for cat in findings.values():
        for item in cat:
            counts[item.get("severity", "INFO")] += 1
    total = sum(counts.values())
    rating = "CRITICAL" if counts["CRITICAL"] else "HIGH" if counts["HIGH"] > 2 else "MEDIUM" if counts["HIGH"] or counts["MEDIUM"] > 3 else "LOW" if counts["MEDIUM"] or counts["LOW"] else "SAFE"
    return {"counts": counts, "total": total, "rating": rating}


def _report(findings: dict, score: dict) -> str:
    lines = [f"SECURITY SCAN — Risk: {score['rating']} | Total: {score['total']} | {score['counts']}", ""]
    for cat, items in findings.items():
        if not items: continue
        lines.append(f"[{cat.upper()}] {len(items)} finding(s)")
        for item in sorted(items, key=lambda x: SEV.get(x.get("severity","INFO"), 4))[:8]:
            f = item.get("file","?")
            d = item.get("type") or item.get("package") or item.get("reason") or ""
            ln = f":{item['line']}" if "line" in item else ""
            lines.append(f"  [{item.get('severity','?')}] {f}{ln} — {d}")
        lines.append("")
    return "\n".join(lines)


from app.core.repo_session import repo_session

async def run_security(repo_path: str, query: str = "full security audit") -> dict:
    local_path = await repo_session.load(repo_path)
    findings = await asyncio.get_event_loop().run_in_executor(None, _scan, local_path)
    score = _score(findings)
    report = _report(findings, score)
    analysis = await invoke_with_rotation([
        SystemMessage(content="You are a senior cybersecurity expert. Analyze scan results. Format: 1) Executive Summary 2) Critical Issues 3) Top Recommendations (max 5). Max 250 words."),
        HumanMessage(content=f"{report}\n\nQUERY: {query}"),
    ], model="openai/gpt-oss-20b")
    return {"risk_rating": score["rating"], "score": score, "findings": findings, "report": report, "expert_analysis": analysis}
