#!/usr/bin/env python3
"""
MLite Issue & Roadmap Generator
Generates all 40 modular markdown issues in .github/issues/ and the master ROADMAP.md.
Validates all 8 required sections for open-source engineering excellence.
"""

import os
import sys
from pathlib import Path
from issues_data import ALL_ISSUES, MILESTONES

BASE_DIR = Path(__file__).resolve().parent.parent
ISSUES_DIR = BASE_DIR / ".github" / "issues"
ROADMAP_FILE = BASE_DIR / "ROADMAP.md"

REQUIRED_SECTIONS = [
    "Problem",
    "Objective",
    "Proposed solution",
    "Technical requirements",
    "Acceptance criteria",
    "Tests",
    "Documentation",
    "Dependencies"
]

def format_list(items):
    return "\n".join(f"- {item}" for item in items)

def generate_markdown(issue):
    tech_reqs = format_list(issue["technical_requirements"])
    criteria = format_list(issue["acceptance_criteria"])
    tests = format_list(issue["tests"])
    docs = format_list(issue["documentation"])
    labels_badge = " ".join(f"`{label}`" for label in issue["labels"])

    content = f"""# #{issue['number']} — {issue['title']}

> **Milestone:** {issue['milestone']}  
> **Priority:** `{issue['priority']}`  
> **Labels:** {labels_badge}  

---

## Problem
{issue['problem']}

## Objective
{issue['objective']}

## Proposed solution
{issue['proposed_solution']}

## Technical requirements
{tech_reqs}

## Acceptance criteria
{criteria}

## Tests
{tests}

## Documentation
{docs}

## Dependencies
{issue['dependencies']}
"""
    return content

def generate_roadmap(issues, milestones):
    roadmap_content = """# 🗺️ MLite Project Roadmap & GitHub Issues Catalog

> **Platform:** MLite — Lightweight Self-Hosted MLOps Platform  
> **Total Issues:** 40  
> **Milestones:** 10 (M0 → M9)  
> **Governance:** Apache 2.0 Open Source  

This document serves as the master index for all **40 concrete GitHub Issues** planned for MLite.  
Each issue is fully documented in English with complete technical specifications across the 8 mandatory engineering sections:
**Problem**, **Objective**, **Proposed solution**, **Technical requirements**, **Acceptance criteria**, **Tests**, **Documentation**, and **Dependencies**.

---

## 🎯 Milestones Overview

```
M0: Project Setup (#1 - #6) ──────► M1: Core MLOps (#7 - #10) ─────► M2: Deployment (#11 - #13)
                                                                             │
M5: Reliability (#23 - #24) ◄───── M4: Monitoring (#17 - #22) ◄───── M3: Dashboard (#14 - #16)
          │
          ▼
M6: Security (#25 - #27) ────────► M7: Quality & CI/CD (#28 - #32)
                                             │
M9: Release (#39 - #40)   ◄─────── M8: Docs & Examples (#33 - #38)
```

| Milestone | Title | Priority Focus | Issues | Description |
| :--- | :--- | :---: | :---: | :--- |
"""
    for m in milestones:
        issues_range = f"#{m['issues'][0]} → #{m['issues'][-1]}"
        roadmap_content += f"| **{m['title'].split(' — ')[0]}** | [{m['title']}](#{m['code'].lower().replace('_', '-')}) | P0/P1 | `{issues_range}` | {m['description']} |\n"

    roadmap_content += "\n---\n\n## 📋 Complete Issues Catalog\n\n"

    for m in milestones:
        anchor = m['code'].lower().replace('_', '-')
        roadmap_content += f"### <a id=\"{anchor}\"></a>{m['title']}\n\n"
        roadmap_content += f"> *{m['description']}*\n\n"
        roadmap_content += "| # | Issue Title | Priority | Labels | Specification File |\n"
        roadmap_content += "| :-: | :--- | :---: | :--- | :--- |\n"

        m_issues = [i for i in issues if i['number'] in m['issues']]
        for issue in m_issues:
            label_tags = " ".join(f"`{l}`" for l in issue['labels'])
            rel_file_path = f".github/issues/{issue['milestone_code']}/{issue['filename']}"
            roadmap_content += f"| **#{issue['number']}** | **{issue['title']}** | `{issue['priority']}` | {label_tags} | [📄 View Issue Spec]({rel_file_path}) |\n"

        roadmap_content += "\n"

    roadmap_content += """---

## 🚀 How to Create These Issues on GitHub

As a maintainer, you can create each issue directly in the GitHub web interface:

1. Go to your repository on GitHub: [github.com/Youssef-Laaroussi/MLOpsLite](https://github.com/Youssef-Laaroussi/MLOpsLite)
2. Open the **Milestones** tab (`/milestones`) and create the 10 Milestones (M0 to M9).
3. Open the **Labels** tab (`/labels`) and ensure tags (`setup`, `backend`, `mlflow`, `storage`, `feature`, `cli`, `registry`, `deployment`, `frontend`, `data`, `monitoring`, `alerting`, `rollback`, `security`, `testing`, `ci/cd`, `docs`, `example`, `release`, `P0`, `P1`, `P2`) exist.
4. Click **New Issue**, copy the title and the complete Markdown content from the corresponding `.github/issues/...` file, assign the Milestone and Labels, and click **Submit new issue**.

---

*Generated for MLite open-source community development.*
"""
    return roadmap_content

def main():
    print("=" * 60)
    print("MLite Issue & Roadmap Generator")
    print("=" * 60)

    if len(ALL_ISSUES) != 40:
        print(f"Error: Expected 40 issues, found {len(ALL_ISSUES)}")
        sys.exit(1)

    # 1. Create Milestone directories and issue markdown files
    for issue in ALL_ISSUES:
        m_dir = ISSUES_DIR / issue["milestone_code"]
        m_dir.mkdir(parents=True, exist_ok=True)

        file_path = m_dir / issue["filename"]
        content = generate_markdown(issue)

        # Validate that all 8 sections exist
        for sec in REQUIRED_SECTIONS:
            if f"## {sec}" not in content:
                print(f"Error: Issue #{issue['number']} is missing section '## {sec}'!")
                sys.exit(1)

        file_path.write_text(content, encoding="utf-8")

    print(f"✅ Generated {len(ALL_ISSUES)} issue markdown files in `.github/issues/`.")

    # 2. Generate master ROADMAP.md
    roadmap_content = generate_roadmap(ALL_ISSUES, MILESTONES)
    ROADMAP_FILE.write_text(roadmap_content, encoding="utf-8")
    print(f"✅ Generated master roadmap in `ROADMAP.md`.")

    print("\nAll 40 issues generated and strictly validated across all 8 sections:")
    for m in MILESTONES:
        m_issues = [i for i in ALL_ISSUES if i['number'] in m['issues']]
        print(f"  • {m['title']}: {len(m_issues)} issues (#{m['issues'][0]} - #{m['issues'][-1]})")

    print("=" * 60)

if __name__ == "__main__":
    main()
