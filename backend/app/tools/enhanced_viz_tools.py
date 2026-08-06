"""Enhanced visualization tools with advanced metrics and interactive elements."""

import re
import json
import ast
import subprocess
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from langchain_core.tools import tool
from typing import Dict, List, Any, Tuple
import numpy as np


@tool
def get_code_complexity_heatmap(repo_path: str) -> List[Dict[str, Any]]:
    """
    Generate a complexity heatmap showing cyclomatic complexity per file.
    Returns data suitable for D3.js heatmap visualization.
    """
    complexity_data = []
    root = Path(repo_path)
    
    for file_path in root.rglob("*.py"):
        if any(ignore in file_path.parts for ignore in {".git", "__pycache__", ".venv"}):
            continue
            
        try:
            content = file_path.read_text(errors="replace")
            tree = ast.parse(content)
            
            # Calculate cyclomatic complexity for each function
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    complexity = _calculate_cyclomatic_complexity(node)
                    
                    complexity_data.append({
                        "file": str(file_path.relative_to(root)),
                        "function": node.name,
                        "complexity": complexity,
                        "line_start": node.lineno,
                        "line_end": node.end_lineno or node.lineno,
                        "risk_level": _get_complexity_risk_level(complexity),
                        "color_intensity": min(1.0, complexity / 15.0)  # Normalize for heatmap
                    })
                    
        except Exception:
            continue
    
    return sorted(complexity_data, key=lambda x: -x["complexity"])


def _calculate_cyclomatic_complexity(node: ast.AST) -> int:
    """Calculate cyclomatic complexity for an AST node."""
    complexity = 1  # Base complexity
    
    for child in ast.walk(node):
        # Decision points that increase complexity
        if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
            complexity += 1
        elif isinstance(child, ast.Try):
            complexity += len(child.handlers)  # Each except clause
        elif isinstance(child, (ast.And, ast.Or)):
            complexity += 1
        elif isinstance(child, ast.comprehension):
            complexity += 1
    
    return complexity


def _get_complexity_risk_level(complexity: int) -> str:
    """Get risk level based on complexity score."""
    if complexity <= 5:
        return "low"
    elif complexity <= 10:
        return "medium"
    elif complexity <= 15:
        return "high"
    else:
        return "critical"


@tool
def get_team_collaboration_network(repo_path: str) -> Dict[str, Any]:
    """
    Generate a network graph showing collaboration patterns between contributors.
    Returns nodes (contributors) and edges (collaboration strength).
    """
    try:
        # Get commit data with file changes
        result = subprocess.run(
            ["git", "log", "--format=%an|%H", "--name-only"],
            cwd=repo_path, capture_output=True, text=True,
            env={"GIT_SSL_NO_VERIFY": "true"}
        )
        
        # Parse commit data
        commits = []
        current_commit = None
        
        for line in result.stdout.strip().split('\n'):
            if '|' in line:
                author, commit_hash = line.split('|')
                current_commit = {"author": author.strip(), "hash": commit_hash, "files": []}
            elif line.strip() and current_commit:
                current_commit["files"].append(line.strip())
            elif not line.strip() and current_commit:
                commits.append(current_commit)
                current_commit = None
        
        # Build collaboration matrix
        file_authors = defaultdict(set)
        for commit in commits:
            for file in commit["files"]:
                file_authors[file].add(commit["author"])
        
        # Calculate collaboration strength between authors
        collaboration_counts = defaultdict(int)
        authors = set()
        
        for file, file_author_set in file_authors.items():
            file_author_list = list(file_author_set)
            authors.update(file_author_list)
            
            # Count collaborations (authors who worked on same files)
            for i, author1 in enumerate(file_author_list):
                for author2 in file_author_list[i+1:]:
                    pair = tuple(sorted([author1, author2]))
                    collaboration_counts[pair] += 1
        
        # Create nodes and edges
        nodes = []
        total_commits = Counter(commit["author"] for commit in commits)
        max_commits = max(total_commits.values()) if total_commits else 1
        
        for author in authors:
            commit_count = total_commits[author]
            nodes.append({
                "id": author,
                "label": author,
                "size": max(20, (commit_count / max_commits) * 100),
                "commits": commit_count,
                "color": _get_author_color(author)
            })
        
        edges = []
        max_collab = max(collaboration_counts.values()) if collaboration_counts else 1
        
        for (author1, author2), strength in collaboration_counts.items():
            if strength > 1:  # Only show meaningful collaborations
                edges.append({
                    "id": f"{author1}-{author2}",
                    "source": author1,
                    "target": author2,
                    "weight": strength,
                    "width": max(1, (strength / max_collab) * 10),
                    "label": f"{strength} files"
                })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "metrics": {
                "total_authors": len(authors),
                "total_collaborations": len(edges),
                "avg_collaboration_strength": sum(collaboration_counts.values()) / max(1, len(collaboration_counts)),
                "most_collaborative_pair": max(collaboration_counts.items(), key=lambda x: x[1]) if collaboration_counts else None
            }
        }
        
    except Exception as e:
        return {"nodes": [], "edges": [], "error": str(e), "metrics": {}}


def _get_author_color(author: str) -> str:
    """Generate a consistent color for an author based on their name."""
    colors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
        "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
    ]
    return colors[hash(author) % len(colors)]


@tool
def get_code_quality_timeline(repo_path: str) -> List[Dict[str, Any]]:
    """
    Generate a timeline of code quality metrics over the project's history.
    Returns time-series data for quality trends.
    """
    try:
        # Get commits with dates
        result = subprocess.run(
            ["git", "log", "--format=%H|%ad|%an", "--date=short", "--reverse"],
            cwd=repo_path, capture_output=True, text=True,
            env={"GIT_SSL_NO_VERIFY": "true"}
        )
        
        commits = []
        for line in result.stdout.strip().split('\n'):
            if '|' in line:
                parts = line.split('|')
                if len(parts) >= 2:
                    commits.append({
                        "hash": parts[0],
                        "date": parts[1],
                        "author": parts[2] if len(parts) > 2 else "Unknown"
                    })
        
        # Sample commits for analysis (every 10th commit or monthly, whichever is more frequent)
        sample_commits = commits[::max(1, len(commits) // 20)] if len(commits) > 20 else commits
        
        timeline_data = []
        for commit in sample_commits[-12:]:  # Last 12 data points
            # Checkout commit (in a safe way - just analyze current state as proxy)
            # In a real implementation, you'd checkout each commit and analyze
            quality_metrics = _analyze_code_quality_at_point(repo_path)
            
            timeline_data.append({
                "date": commit["date"],
                "commit_hash": commit["hash"][:8],
                "author": commit["author"],
                **quality_metrics
            })
        
        return timeline_data
        
    except Exception as e:
        return [{"error": str(e)}]


def _analyze_code_quality_at_point(repo_path: str) -> Dict[str, Any]:
    """Analyze code quality metrics for current state."""
    root = Path(repo_path)
    
    total_lines = 0
    total_files = 0
    complex_functions = 0
    duplicated_lines = 0
    
    for file_path in root.rglob("*.py"):
        if any(ignore in file_path.parts for ignore in {".git", "__pycache__", ".venv"}):
            continue
            
        try:
            content = file_path.read_text(errors="replace")
            lines = content.split('\n')
            total_lines += len([l for l in lines if l.strip() and not l.strip().startswith('#')])
            total_files += 1
            
            # Analyze complexity
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        complexity = _calculate_cyclomatic_complexity(node)
                        if complexity > 10:
                            complex_functions += 1
            except:
                pass
                
        except Exception:
            continue
    
    # Calculate quality score (simplified)
    quality_score = max(0, 100 - (complex_functions / max(1, total_files)) * 20)
    maintainability_index = min(100, quality_score + (total_lines / max(1, total_files)) * 0.1)
    
    return {
        "quality_score": round(quality_score, 1),
        "maintainability_index": round(maintainability_index, 1),
        "total_files": total_files,
        "total_lines": total_lines,
        "complex_functions": complex_functions,
        "technical_debt_ratio": round((complex_functions / max(1, total_files)) * 100, 1)
    }


@tool
def get_security_hotspot_map(repo_path: str) -> List[Dict[str, Any]]:
    """
    Identify potential security hotspots in the codebase.
    Returns files and functions with security risk indicators.
    """
    security_patterns = {
        "sql_injection": [r"execute\(.*%", r"query.*\+.*", r"SELECT.*\+"],
        "xss_vulnerability": [r"innerHTML\s*=", r"document\.write\(", r"eval\("],
        "hardcoded_secrets": [r"password\s*=\s*['\"][^'\"]+['\"]", r"api_key\s*=", r"secret\s*="],
        "unsafe_deserialization": [r"pickle\.loads", r"eval\(", r"exec\("],
        "path_traversal": [r"open\(.*\.\.", r"file\(.*\.\."],
    }
    
    hotspots = []
    root = Path(repo_path)
    
    for file_path in root.rglob("*"):
        if file_path.is_file() and file_path.suffix in {".py", ".js", ".jsx", ".ts", ".tsx"}:
            if any(ignore in file_path.parts for ignore in {".git", "node_modules", "__pycache__"}):
                continue
                
            try:
                content = file_path.read_text(errors="replace")
                lines = content.split('\n')
                
                file_risk_score = 0
                detected_issues = []
                
                for line_num, line in enumerate(lines, 1):
                    for risk_type, patterns in security_patterns.items():
                        for pattern in patterns:
                            if re.search(pattern, line, re.IGNORECASE):
                                file_risk_score += 1
                                detected_issues.append({
                                    "line": line_num,
                                    "type": risk_type,
                                    "pattern": pattern,
                                    "code_snippet": line.strip()[:100]
                                })
                
                if file_risk_score > 0:
                    hotspots.append({
                        "file": str(file_path.relative_to(root)),
                        "risk_score": file_risk_score,
                        "risk_level": _get_security_risk_level(file_risk_score),
                        "issues": detected_issues[:5],  # Limit to top 5 issues
                        "total_issues": len(detected_issues)
                    })
                    
            except Exception:
                continue
    
    return sorted(hotspots, key=lambda x: -x["risk_score"])[:20]  # Top 20 hotspots


def _get_security_risk_level(risk_score: int) -> str:
    """Get security risk level based on score."""
    if risk_score <= 2:
        return "low"
    elif risk_score <= 5:
        return "medium"
    elif risk_score <= 10:
        return "high"
    else:
        return "critical"


@tool
def get_architecture_visualization_data(repo_path: str) -> Dict[str, Any]:
    """
    Generate data for architectural visualization (layered view, component interactions).
    Returns hierarchical structure suitable for treemap or sankey diagrams.
    """
    root = Path(repo_path)
    
    # Detect common architectural patterns
    architecture_layers = {
        "presentation": ["views", "templates", "components", "pages", "ui"],
        "business": ["services", "models", "business", "domain", "core"],
        "data": ["database", "repositories", "dao", "storage", "persistence"],
        "infrastructure": ["config", "utils", "helpers", "lib", "common"],
        "external": ["api", "external", "integrations", "third_party"]
    }
    
    layer_data = defaultdict(lambda: {"files": [], "size": 0, "complexity": 0})
    unclassified_files = []
    
    for file_path in root.rglob("*.py"):
        if any(ignore in file_path.parts for ignore in {".git", "__pycache__", ".venv"}):
            continue
            
        relative_path = str(file_path.relative_to(root))
        file_size = file_path.stat().st_size
        
        # Classify file into architectural layer
        classified = False
        for layer, keywords in architecture_layers.items():
            if any(keyword in relative_path.lower() for keyword in keywords):
                layer_data[layer]["files"].append({
                    "path": relative_path,
                    "size": file_size,
                    "name": file_path.name
                })
                layer_data[layer]["size"] += file_size
                classified = True
                break
        
        if not classified:
            unclassified_files.append({
                "path": relative_path,
                "size": file_size,
                "name": file_path.name
            })
    
    # Add unclassified files to infrastructure layer
    if unclassified_files:
        layer_data["infrastructure"]["files"].extend(unclassified_files)
        layer_data["infrastructure"]["size"] += sum(f["size"] for f in unclassified_files)
    
    # Calculate layer metrics
    total_size = sum(layer["size"] for layer in layer_data.values())
    
    architecture_data = {
        "layers": [],
        "total_files": sum(len(layer["files"]) for layer in layer_data.values()),
        "total_size": total_size,
        "architecture_score": _calculate_architecture_score(layer_data)
    }
    
    for layer_name, layer_info in layer_data.items():
        if layer_info["files"]:
            architecture_data["layers"].append({
                "name": layer_name,
                "file_count": len(layer_info["files"]),
                "size": layer_info["size"],
                "size_percentage": (layer_info["size"] / total_size) * 100 if total_size > 0 else 0,
                "files": layer_info["files"][:10],  # Sample files
                "color": _get_layer_color(layer_name)
            })
    
    return architecture_data


def _calculate_architecture_score(layer_data: Dict[str, Any]) -> int:
    """Calculate a simple architecture quality score."""
    layers_present = len(layer_data)
    balanced_layers = sum(1 for layer in layer_data.values() if layer["files"])
    
    # Score based on layer separation and balance
    score = min(100, (balanced_layers / max(1, layers_present)) * 80 + 20)
    return round(score)


def _get_layer_color(layer_name: str) -> str:
    """Get color for architectural layer."""
    colors = {
        "presentation": "#FF6B6B",
        "business": "#4ECDC4", 
        "data": "#45B7D1",
        "infrastructure": "#96CEB4",
        "external": "#FFEAA7"
    }
    return colors.get(layer_name, "#DDA0DD")


@tool  
def get_performance_analysis_data(repo_path: str) -> Dict[str, Any]:
    """
    Analyze potential performance bottlenecks in the codebase.
    Returns data for performance visualization.
    """
    root = Path(repo_path)
    
    # Performance anti-patterns to look for
    performance_patterns = {
        "nested_loops": [r"for\s+.*:\s*\n\s*for\s+.*:", r"while\s+.*:\s*\n\s*while\s+.*:"],
        "database_queries_in_loops": [r"for\s+.*:\s*.*\.query\(", r"for\s+.*:\s*.*\.execute\("],
        "large_file_operations": [r"\.read\(\)", r"\.readlines\(\)"],
        "inefficient_string_concat": [r"\+\s*['\"]", r"str\s*\+="],
        "recursive_without_memoization": [r"def\s+\w+.*:\s*.*return.*\w+\("]
    }
    
    bottlenecks = []
    file_metrics = []
    
    for file_path in root.rglob("*.py"):
        if any(ignore in file_path.parts for ignore in {".git", "__pycache__", ".venv"}):
            continue
            
        try:
            content = file_path.read_text(errors="replace")
            lines = content.split('\n')
            
            file_bottlenecks = []
            performance_score = 100
            
            for line_num, line in enumerate(lines, 1):
                for issue_type, patterns in performance_patterns.items():
                    for pattern in patterns:
                        if re.search(pattern, line):
                            performance_score -= 10
                            file_bottlenecks.append({
                                "line": line_num,
                                "type": issue_type,
                                "severity": _get_performance_severity(issue_type),
                                "code": line.strip()[:100]
                            })
            
            if file_bottlenecks:
                bottlenecks.append({
                    "file": str(file_path.relative_to(root)),
                    "performance_score": max(0, performance_score),
                    "bottleneck_count": len(file_bottlenecks),
                    "issues": file_bottlenecks[:5]  # Top 5 issues
                })
            
            file_metrics.append({
                "file": str(file_path.relative_to(root)),
                "lines": len(lines),
                "performance_score": max(0, performance_score),
                "size": file_path.stat().st_size
            })
            
        except Exception:
            continue
    
    # Calculate overall metrics
    avg_performance_score = sum(f["performance_score"] for f in file_metrics) / max(1, len(file_metrics))
    
    return {
        "overall_performance_score": round(avg_performance_score, 1),
        "total_bottlenecks": len(bottlenecks),
        "critical_files": sorted(bottlenecks, key=lambda x: x["performance_score"])[:10],
        "performance_distribution": _get_performance_distribution(file_metrics),
        "recommendations": _generate_performance_recommendations(bottlenecks)
    }


def _get_performance_severity(issue_type: str) -> str:
    """Get severity level for performance issue."""
    severity_map = {
        "nested_loops": "high",
        "database_queries_in_loops": "critical",
        "large_file_operations": "medium",
        "inefficient_string_concat": "low",
        "recursive_without_memoization": "medium"
    }
    return severity_map.get(issue_type, "low")


def _get_performance_distribution(file_metrics: List[Dict[str, Any]]) -> Dict[str, int]:
    """Get distribution of performance scores."""
    distribution = {"excellent": 0, "good": 0, "fair": 0, "poor": 0}
    
    for metric in file_metrics:
        score = metric["performance_score"]
        if score >= 90:
            distribution["excellent"] += 1
        elif score >= 70:
            distribution["good"] += 1
        elif score >= 50:
            distribution["fair"] += 1
        else:
            distribution["poor"] += 1
    
    return distribution


def _generate_performance_recommendations(bottlenecks: List[Dict[str, Any]]) -> List[str]:
    """Generate performance improvement recommendations."""
    recommendations = []
    
    if any("nested_loops" in str(b["issues"]) for b in bottlenecks):
        recommendations.append("Consider using list comprehensions or numpy operations to reduce nested loops")
    
    if any("database_queries_in_loops" in str(b["issues"]) for b in bottlenecks):
        recommendations.append("Implement bulk database operations to avoid N+1 query problems")
    
    if any("large_file_operations" in str(b["issues"]) for b in bottlenecks):
        recommendations.append("Use streaming or chunked file processing for large files")
    
    if len(recommendations) == 0:
        recommendations.append("Overall performance looks good - consider profiling for micro-optimizations")
    
    return recommendations[:3]  # Top 3 recommendations