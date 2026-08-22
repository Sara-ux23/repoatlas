"""Trace Agent — git history timeline analyzer."""

import os, asyncio, warnings, certifi
warnings.filterwarnings("ignore")
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
os.environ["SSL_CERT_FILE"] = certifi.where()

from langchain_core.messages import HumanMessage, SystemMessage
from app.tools.github_tools import clone_repo, cleanup_repo
from app.tools.git_tools import get_commit_log, get_contributor_stats, get_branch_info, get_file_history
from app.core.llm import invoke_with_rotation


def _timeline(commits: list) -> str:
    if not commits:
        return "No commits found."
    lines = ["COMMIT TIMELINE (newest → oldest)", "=" * 60]
    for i, c in enumerate(commits):
        lines.append(f"● [{c['short_hash']}] {c['date'][:10]}  {c['author']}")
        lines.append(f"{'│' if i < len(commits)-1 else ' '}   {c['message']}")
        if i < len(commits) - 1:
            lines.append("│")
    lines.append("=" * 60)
    return "\n".join(lines)


def _gather(local_path: str, file_path=None) -> dict:
    commits = get_commit_log.invoke({"repo_path": local_path, "limit": 30})
    return {
        "commits": commits,
        "contributors": get_contributor_stats.invoke({"repo_path": local_path}),
        "branches": get_branch_info.invoke({"repo_path": local_path}),
        "file_history": get_file_history.invoke({"repo_path": local_path, "file_path": file_path, "limit": 20}) if file_path else [],
        "timeline_ascii": _timeline(commits),
    }


from app.core.repo_session import repo_session

async def run_trace(repo_path: str, query: str, file_path=None) -> dict:
    local_path = await repo_session.load(repo_path)
    ctx = await asyncio.get_event_loop().run_in_executor(None, _gather, local_path, file_path)
    summary = await invoke_with_rotation([
        SystemMessage(content="You are the Trace Agent for RepoAtlas AI. Analyze git history concisely into clear key-value points. Put each key-value pair on a new line (e.g. **Latest Commit**: ... \\n **Contributors**: ...). Do not smash tags together."),
        HumanMessage(content=f"{ctx['timeline_ascii']}\nContributors: {ctx['contributors']}\nBranches: {ctx['branches']}\nQUERY: {query}"),
    ], model="llama-3.3-70b-versatile")
    return {
        "timeline": ctx["timeline_ascii"],
        "commits": ctx["commits"],
        "contributors": ctx["contributors"],
        "branches": ctx["branches"],
        "file_history": ctx["file_history"],
        "summary": summary,
    }


async def _inspect_one_repo(repo_input: str) -> dict:
    from app.core.repo_session import repo_session
    from app.tools.viz_tools import get_language_breakdown
    from app.tools.security_tools import scan_secrets, scan_vulnerabilities

    cloned = False
    if repo_input.startswith("http://") or repo_input.startswith("https://"):
        local_path = await asyncio.get_event_loop().run_in_executor(None, clone_repo, repo_input)
        cloned = True
    elif repo_session.has_repo(repo_input):
        local_path = repo_session.local_path
    else:
        local_path = repo_input

    try:
        def _bg_scan():
            commits = get_commit_log.invoke({"repo_path": local_path, "limit": 50})
            contributors = get_contributor_stats.invoke({"repo_path": local_path})
            branches = get_branch_info.invoke({"repo_path": local_path})
            langs = get_language_breakdown.invoke({"repo_path": local_path})
            secrets = scan_secrets.invoke({"repo_path": local_path})
            vulns = scan_vulnerabilities.invoke({"repo_path": local_path})

            total_commits = len(commits)
            total_contributors = len(contributors)
            total_lines = sum(l.get("lines", 0) for l in langs)
            primary_lang = langs[0]["language"] if langs else "Unknown"

            critical_count = len(secrets) + sum(1 for v in vulns if v.get("severity") in ["CRITICAL", "HIGH"])
            risk_rating = "HIGH" if critical_count > 3 else "MEDIUM" if critical_count > 0 else "SAFE"

            # Calculate monthly commit velocity
            dates = [c.get("date", "")[:7] for c in commits if c.get("date")]
            monthly_velocity = round(len(commits) / max(1, len(set(dates))), 1)

            repo_name = repo_input.rstrip("/").split("/")[-1]
            return {
                "repo_name": repo_name,
                "repo_url": repo_input,
                "total_commits": total_commits,
                "total_contributors": total_contributors,
                "total_lines": total_lines,
                "primary_lang": primary_lang,
                "monthly_velocity": monthly_velocity,
                "branches_count": len(branches.get("all", [])),
                "security_risk": risk_rating,
                "critical_vulns": critical_count,
                "languages": langs[:4],
                "top_contributor": contributors[0]["author"] if contributors else "Unknown",
            }

        return await asyncio.get_event_loop().run_in_executor(None, _bg_scan)
    finally:
        if cloned:
            cleanup_repo(local_path)


async def run_repo_comparison(repo_url_1: str, repo_url_2: str) -> dict:
    """Compare two repositories side-by-side across commit velocity, contributors, security, and complexity."""
    r1_task = _inspect_one_repo(repo_url_1)
    r2_task = _inspect_one_repo(repo_url_2)

    repo1_stats, repo2_stats = await asyncio.gather(r1_task, r2_task)

    prompt = (
        f"Compare these two software repositories side-by-side:\n\n"
        f"REPO 1 ({repo1_stats['repo_name']}):\n"
        f"- Commits: {repo1_stats['total_commits']} | Velocity: {repo1_stats['monthly_velocity']} commits/mo\n"
        f"- Contributors: {repo1_stats['total_contributors']} (Top: {repo1_stats['top_contributor']})\n"
        f"- Stack: {repo1_stats['primary_lang']} ({repo1_stats['total_lines']:,} lines)\n"
        f"- Security Risk: {repo1_stats['security_risk']} ({repo1_stats['critical_vulns']} issues)\n\n"
        f"REPO 2 ({repo2_stats['repo_name']}):\n"
        f"- Commits: {repo2_stats['total_commits']} | Velocity: {repo2_stats['monthly_velocity']} commits/mo\n"
        f"- Contributors: {repo2_stats['total_contributors']} (Top: {repo2_stats['top_contributor']})\n"
        f"- Stack: {repo2_stats['primary_lang']} ({repo2_stats['total_lines']:,} lines)\n"
        f"- Security Risk: {repo2_stats['security_risk']} ({repo2_stats['critical_vulns']} issues)\n\n"
        f"Format your answer concise and structured:\n"
        f"1) Velocity & Activity Winner\n"
        f"2) Security & Maintainability Winner\n"
        f"3) Architectural Verdict (max 150 words)."
    )

    try:
        verdict = await invoke_with_rotation(
            [
                SystemMessage(content="You are a senior software architect comparing two codebases."),
                HumanMessage(content=prompt),
            ],
            model="llama-3.3-70b-versatile"
        )
    except Exception as e:
        verdict = f"Side-by-side comparison generated. {repo1_stats['repo_name']} vs {repo2_stats['repo_name']}."

    return {
        "repo1": repo1_stats,
        "repo2": repo2_stats,
        "verdict": verdict,
    }

