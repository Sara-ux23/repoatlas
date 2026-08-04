"""
Security scanning tools for the Security Agent.
Covers secrets, vulnerable deps, code patterns, misconfigs, and exposure risks.
"""

import re
import json
from pathlib import Path
from langchain_core.tools import tool

IGNORED_DIRS = {".git", "node_modules", "__pycache__", ".venv", "dist", "build", ".next"}

# ── Secret patterns ────────────────────────────────────────────────────────────
SECRET_PATTERNS = {
    "AWS Access Key":       r"AKIA[0-9A-Z]{16}",
    "AWS Secret Key":       r"(?i)aws.{0,20}secret.{0,20}['\"][0-9a-zA-Z/+]{40}['\"]",
    "Google API Key":       r"AIza[0-9A-Za-z\-_]{35}",
    "Groq API Key":         r"gsk_[0-9A-Za-z]{50,}",
    "GitHub Token":         r"ghp_[0-9A-Za-z]{36}",
    "Stripe Secret":        r"sk_live_[0-9a-zA-Z]{24}",
    "Stripe Publishable":   r"pk_live_[0-9a-zA-Z]{24}",
    "Private Key Block":    r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "JWT Secret":           r"(?i)jwt.{0,10}secret\s*=\s*['\"][^'\"]{8,}['\"]",
    "Database URL":         r"(?i)(mongodb|postgres|mysql|redis):\/\/[^\s\"']+",
    "Generic Password":     r"(?i)(password|passwd|pwd)\s*=\s*['\"][^'\"]{6,}['\"]",
    "Generic API Key":      r"(?i)(api_key|apikey|api-key)\s*[=:]\s*['\"][^'\"]{8,}['\"]",
    "Bearer Token":         r"(?i)bearer\s+[a-zA-Z0-9\-_\.]{20,}",
}

# ── Dangerous code patterns ────────────────────────────────────────────────────
VULN_PATTERNS = {
    "SQL Injection Risk":         (r"(?i)(execute|query|cursor\.execute)\s*\(\s*[\"'].*%s.*[\"']", ["*.py"]),
    "Command Injection (Python)": (r"(?i)(os\.system|subprocess\.call|eval|exec)\s*\(", ["*.py"]),
    "Command Injection (JS)":     (r"(?i)(eval|exec|child_process|execSync)\s*\(", ["*.js", "*.ts"]),
    "Hardcoded IP":               (r"\b(?:\d{1,3}\.){3}\d{1,3}\b", ["*.py", "*.js", "*.ts", "*.env*"]),
    "XXE / XML Injection":        (r"(?i)(parsexml|xmlparser|etree\.parse|lxml)", ["*.py"]),
    "Path Traversal":             (r"(?i)(\.\.\/|\.\.\\\\)", ["*.py", "*.js", "*.ts"]),
    "Insecure Deserialization":   (r"(?i)(pickle\.loads|yaml\.load\s*\((?!.*Loader))", ["*.py"]),
    "Weak Hashing":               (r"(?i)(md5|sha1)\s*\(", ["*.py", "*.js", "*.ts"]),
    "Debug Mode Enabled":         (r"(?i)(DEBUG\s*=\s*True|app\.run.*debug\s*=\s*True)", ["*.py"]),
    "CORS Wildcard":              (r"(?i)(allow_origins.*\*|Access-Control-Allow-Origin.*\*)", ["*.py", "*.js", "*.ts"]),
    "No Auth Check":              (r"(?i)(@app\.route|router\.(get|post|put|delete))(?!.*auth)", ["*.py"]),
    "Console.log Sensitive":      (r"(?i)console\.log\s*\(.*?(password|token|secret|key)", ["*.js", "*.ts"]),
}

# ── Risky files that should never be committed ─────────────────────────────────
SENSITIVE_FILES = [
    ".env", ".env.local", ".env.production", ".env.development",
    "*.pem", "*.key", "*.p12", "*.pfx", "id_rsa", "id_ed25519",
    "credentials.json", "serviceAccountKey.json", "secrets.json",
    "*.sqlite", "*.db", "config/database.yml",
]

# ── Known vulnerable package versions (simplified) ────────────────────────────
VULN_PACKAGES = {
    # npm
    "lodash": "<4.17.21",
    "axios": "<0.21.1",
    "express": "<4.17.3",
    "jsonwebtoken": "<9.0.0",
    "node-fetch": "<2.6.7",
    # python
    "flask": "<2.0.0",
    "django": "<3.2.0",
    "requests": "<2.28.0",
    "pyyaml": "<6.0",
    "pillow": "<9.0.0",
}


def _iter_files(root: Path):
    for fp in sorted(root.rglob("*")):
        if fp.is_file() and not any(p in IGNORED_DIRS for p in fp.parts):
            yield fp


@tool
def scan_secrets(repo_path: str) -> list[dict]:
    """
    Scan all files for hardcoded secrets, API keys, tokens, and credentials.

    Returns:
        List of findings with file, line, type, and redacted match.
    """
    root = Path(repo_path)
    findings = []

    for fp in _iter_files(root):
        try:
            content = fp.read_text(errors="replace")
            for secret_type, pattern in SECRET_PATTERNS.items():
                for m in re.finditer(pattern, content):
                    line_no = content[:m.start()].count("\n") + 1
                    raw = m.group(0)
                    redacted = raw[:6] + "..." + raw[-4:] if len(raw) > 12 else "***"
                    findings.append({
                        "severity": "CRITICAL",
                        "type": secret_type,
                        "file": str(fp.relative_to(root)),
                        "line": line_no,
                        "match": redacted,
                    })
        except Exception:
            continue

    return findings


@tool
def scan_vulnerabilities(repo_path: str) -> list[dict]:
    """
    Scan source files for dangerous code patterns (injection, weak crypto, etc).

    Returns:
        List of vulnerability findings with severity, file, line, and description.
    """
    root = Path(repo_path)
    findings = []
    severity_map = {
        "SQL Injection Risk": "HIGH",
        "Command Injection (Python)": "HIGH",
        "Command Injection (JS)": "HIGH",
        "Path Traversal": "HIGH",
        "Insecure Deserialization": "HIGH",
        "XXE / XML Injection": "MEDIUM",
        "Weak Hashing": "MEDIUM",
        "Debug Mode Enabled": "MEDIUM",
        "CORS Wildcard": "MEDIUM",
        "No Auth Check": "LOW",
        "Console.log Sensitive": "LOW",
        "Hardcoded IP": "INFO",
    }

    for fp in _iter_files(root):
        try:
            content = fp.read_text(errors="replace")
            for vuln_name, (pattern, _globs) in VULN_PATTERNS.items():
                for m in re.finditer(pattern, content):
                    line_no = content[:m.start()].count("\n") + 1
                    findings.append({
                        "severity": severity_map.get(vuln_name, "LOW"),
                        "type": vuln_name,
                        "file": str(fp.relative_to(root)),
                        "line": line_no,
                        "snippet": m.group(0)[:120],
                    })
        except Exception:
            continue

    return findings


@tool
def scan_sensitive_files(repo_path: str) -> list[dict]:
    """
    Detect sensitive files that should not be in the repository.

    Returns:
        List of risky files found with severity.
    """
    import fnmatch
    root = Path(repo_path)
    findings = []

    for fp in _iter_files(root):
        rel = str(fp.relative_to(root))
        name = fp.name
        for pattern in SENSITIVE_FILES:
            if fnmatch.fnmatch(name, pattern) or fnmatch.fnmatch(rel, pattern):
                severity = "CRITICAL" if any(x in name for x in [".env", ".pem", ".key", "id_rsa"]) else "HIGH"
                findings.append({
                    "severity": severity,
                    "file": rel,
                    "reason": f"Matches sensitive file pattern: {pattern}",
                })
                break

    return findings


@tool
def scan_dependencies(repo_path: str) -> list[dict]:
    """
    Check package.json and requirements.txt for known vulnerable dependencies.

    Returns:
        List of potentially vulnerable packages found.
    """
    root = Path(repo_path)
    findings = []

    # Check package.json
    for pkg_json in root.rglob("package.json"):
        if any(p in IGNORED_DIRS for p in pkg_json.parts):
            continue
        try:
            data = json.loads(pkg_json.read_text(errors="replace"))
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            for pkg, vuln_version in VULN_PACKAGES.items():
                if pkg in deps:
                    findings.append({
                        "severity": "HIGH",
                        "file": str(pkg_json.relative_to(root)),
                        "package": pkg,
                        "installed": deps[pkg],
                        "safe_version": vuln_version.replace("<", ">="),
                        "note": f"Update to {vuln_version.replace('<', '>=')}",
                    })
        except Exception:
            continue

    # Check requirements.txt
    for req_file in root.rglob("requirements*.txt"):
        try:
            lines = req_file.read_text(errors="replace").splitlines()
            for line in lines:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                pkg_name = re.split(r"[>=<!]", line)[0].lower().strip()
                if pkg_name in VULN_PACKAGES:
                    findings.append({
                        "severity": "HIGH",
                        "file": str(req_file.relative_to(root)),
                        "package": pkg_name,
                        "installed": line,
                        "safe_version": VULN_PACKAGES[pkg_name].replace("<", ">="),
                        "note": f"Verify version meets {VULN_PACKAGES[pkg_name].replace('<', '>=')}",
                    })
        except Exception:
            continue

    return findings


@tool
def scan_misconfigurations(repo_path: str) -> list[dict]:
    """
    Detect common security misconfigurations in config files.

    Returns:
        List of misconfiguration findings.
    """
    root = Path(repo_path)
    findings = []

    config_checks = {
        "*.json": [
            (r'"debug"\s*:\s*true', "DEBUG mode enabled in JSON config", "MEDIUM"),
            (r'"ssl"\s*:\s*false', "SSL disabled in config", "HIGH"),
            (r'"auth"\s*:\s*false', "Authentication disabled", "CRITICAL"),
        ],
        "*.yml": [
            (r'(?i)allow_unauthenticated:\s*true', "Unauthenticated access allowed", "CRITICAL"),
            (r'(?i)ssl_verify:\s*false', "SSL verification disabled", "HIGH"),
        ],
        "*.yaml": [
            (r'(?i)insecure:\s*true', "Insecure mode enabled", "HIGH"),
        ],
        "Dockerfile*": [
            (r'(?i)FROM\s+\w+:latest', "Using 'latest' tag is unpredictable", "LOW"),
            (r'(?i)USER root', "Running container as root", "HIGH"),
        ],
        ".gitignore": [],  # checked separately
    }

    # Check if .env is gitignored
    gitignore = root / ".gitignore"
    if gitignore.exists():
        content = gitignore.read_text(errors="replace")
        if ".env" not in content:
            findings.append({
                "severity": "CRITICAL",
                "file": ".gitignore",
                "type": "Missing .env in .gitignore",
                "detail": ".env is not in .gitignore — secrets may be committed",
            })
    else:
        findings.append({
            "severity": "HIGH",
            "file": "/",
            "type": "No .gitignore found",
            "detail": "Repository has no .gitignore — sensitive files may be tracked",
        })

    import fnmatch
    for fp in _iter_files(root):
        try:
            content = fp.read_text(errors="replace")
            for glob_pattern, checks in config_checks.items():
                if fnmatch.fnmatch(fp.name, glob_pattern):
                    for pattern, desc, severity in checks:
                        if re.search(pattern, content):
                            line_no = next(
                                (i+1 for i, l in enumerate(content.splitlines())
                                 if re.search(pattern, l)), 0
                            )
                            findings.append({
                                "severity": severity,
                                "file": str(fp.relative_to(root)),
                                "type": desc,
                                "line": line_no,
                            })
        except Exception:
            continue

    return findings
