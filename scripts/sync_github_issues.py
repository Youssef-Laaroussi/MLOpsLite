#!/usr/bin/env python3
"""
MLite GitHub Issues Sync & Validator Tool
Validates the 40 markdown issues, checks milestones and labels,
and optionally interacts with GitHub REST API via token.
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "scripts"))

from issues_data import ALL_ISSUES, MILESTONES

GITHUB_API_BASE = "https://api.github.com"

# Standard label color palette
LABEL_COLORS = {
    "P0": "B60205",         # Red / Highest priority
    "P1": "D93F0B",         # Orange / High priority
    "P2": "FBCA04",         # Yellow / Normal priority
    "setup": "5319E7",      # Purple / Setup
    "backend": "0052CC",    # Blue / Backend
    "mlflow": "0194E2",     # Cyan / MLflow
    "storage": "0E8A16",    # Green / Storage
    "feature": "1D76DB",    # Blue / Feature
    "cli": "006B75",        # Teal / CLI
    "registry": "BFDADC",   # Light Blue / Registry
    "deployment": "1F883D", # Dark green / Deployment
    "frontend": "61DAFB",   # React blue / Frontend
    "data": "C5DEF5",       # Soft blue / Data
    "monitoring": "D4C5F9", # Lavender / Monitoring
    "alerting": "E99695",   # Salmon / Alerting
    "rollback": "B60205",   # Red / Rollback
    "security": "D93F0B",   # Orange / Security
    "testing": "0E8A16",    # Green / Testing
    "ci/cd": "24292F",      # Black / CI/CD
    "docs": "0075CA",       # Blue / Docs
    "example": "BFDADc",    # Mint / Example
    "release": "6F42C1",    # Purple / Release
}

def validate_issues():
    print("\n🔍 Validating all 40 issue markdown files...")
    issues_dir = BASE_DIR / ".github" / "issues"
    required_sections = [
        "Problem",
        "Objective",
        "Proposed solution",
        "Technical requirements",
        "Acceptance criteria",
        "Tests",
        "Documentation",
        "Dependencies"
    ]

    all_valid = True
    for issue in ALL_ISSUES:
        file_path = issues_dir / issue["milestone_code"] / issue["filename"]
        if not file_path.exists():
            print(f"❌ Missing file: {file_path}")
            all_valid = False
            continue

        content = file_path.read_text(encoding="utf-8")
        for sec in required_sections:
            if f"## {sec}" not in content:
                print(f"❌ Issue #{issue['number']} missing section '## {sec}'")
                all_valid = False

    if all_valid:
        print(f"✅ All {len(ALL_ISSUES)} issues are present, valid, and contain all 8 mandatory sections!")
    else:
        print("❌ Validation errors found.")
    return all_valid

def print_summary():
    print("=" * 80)
    print("📋 MLITE - 40 GITHUB ISSUES CATALOG & MILESTONES SUMMARY")
    print("=" * 80)
    for m in MILESTONES:
        m_issues = [i for i in ALL_ISSUES if i['number'] in m['issues']]
        print(f"\n🏷️  {m['title']} ({len(m_issues)} issues)")
        print(f"   Scope: {m['description']}")
        print("   " + "-" * 74)
        for issue in m_issues:
            labels_str = ", ".join(issue['labels'])
            print(f"   #{issue['number']:02d} | [{issue['priority']}] {issue['title'][:50]:<50} | {labels_str}")
    print("\n" + "=" * 80)

def github_request(endpoint, token, method="GET", data=None):
    url = f"{GITHUB_API_BASE}{endpoint}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "MLite-Issue-Sync",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 201):
                return json.loads(resp.read().decode("utf-8"))
            return None
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        return {"error": e.code, "message": err_msg}

def main():
    parser = argparse.ArgumentParser(description="MLite GitHub Issues Manager & Validator")
    parser.add_argument("--validate", action="store_true", help="Validate all 40 markdown issue files")
    parser.add_argument("--summary", action="store_true", help="Display roadmap summary in terminal")
    parser.add_argument("--repo", type=str, default="Youssef-Laaroussi/MLOpsLite", help="GitHub repo (owner/repo)")
    parser.add_argument("--token", type=str, default=os.getenv("GITHUB_TOKEN"), help="GitHub Personal Access Token")
    parser.add_argument("--create-milestones", action="store_true", help="Create the 10 milestones on GitHub")
    parser.add_argument("--create-labels", action="store_true", help="Create designated labels with colors on GitHub")
    args = parser.parse_args()

    if len(sys.argv) == 1 or args.summary:
        print_summary()
        validate_issues()
        return

    if args.validate:
        valid = validate_issues()
        sys.exit(0 if valid else 1)

    if args.create_milestones:
        if not args.token:
            print("Error: --token or GITHUB_TOKEN environment variable required for GitHub API actions.")
            sys.exit(1)
        print(f"\n🚀 Creating 10 Milestones on {args.repo}...")
        for m in MILESTONES:
            payload = {"title": m["title"], "description": m["description"], "state": "open"}
            res = github_request(f"/repos/{args.repo}/milestones", args.token, method="POST", data=payload)
            if "error" in res:
                print(f"  • {m['title']}: {res['message']}")
            else:
                print(f"  ✅ Created milestone: {m['title']}")

    if args.create_labels:
        if not args.token:
            print("Error: --token or GITHUB_TOKEN environment variable required for GitHub API actions.")
            sys.exit(1)
        print(f"\n🚀 Creating custom labels on {args.repo}...")
        for label, color in LABEL_COLORS.items():
            payload = {"name": label, "color": color}
            res = github_request(f"/repos/{args.repo}/labels", args.token, method="POST", data=payload)
            if "error" in res:
                print(f"  • Label {label}: already exists or error")
            else:
                print(f"  ✅ Created label: {label} (#{color})")

if __name__ == "__main__":
    main()
