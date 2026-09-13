# #34 — Write complete CLI command reference and shell autocompletion guide

> **Milestone:** M8 — Documentation & Examples  
> **Priority:** `P1`  
> **Labels:** `docs` `P1`  

---

## Problem
Users need an exhaustive reference document describing every CLI subcommand, flag, argument, environment variable override, and exit code to use MLite effectively in automated shell scripts and daily workflows.

## Objective
Create an exhaustive CLI reference manual in `docs/cli/` documenting all 11 planned command groups (`init`, `config`, `status`, `data`, `experiment`, `model`, `deploy`, `monitor`, `alert`, `rollback`, `logs`).

## Proposed solution
Generate markdown reference pages for all Typer commands with usage syntax, argument descriptions, flag tables, practical examples, and expected stdout outputs. Include instructions for enabling bash/zsh/fish autocompletion.

## Technical requirements
- Command documentation pages: `mlite init`, `mlite data`, `mlite experiment`, `mlite model`, `mlite deploy`, `mlite monitor`, `mlite alert`, `mlite rollback`.
- Every command page includes: Synopsis, Options, Output format, Examples, Exit codes.
- Shell completion instructions for Bash (`eval "$(_MLITE_COMPLETE=bash_source mlite)"`), Zsh, and Fish.
- Automated sync: script or test checking that CLI help text matches documentation.

## Acceptance criteria
- All CLI commands and subcommands have full documentation with real usage examples.
- Autocompletion installation instructions work on standard Linux and macOS shells.
- Exit codes are clearly defined (0 = success, 1 = error, 2 = validation error, 130 = user aborted).
- Documentation is indexed in MkDocs navigation.

## Tests
- Verify all CLI documentation code snippets by running automated markdown code block tests.
- Validate documentation against `mlite --help` output.

## Documentation
- `docs/cli/overview.md`.
- `docs/cli/commands.md`.
- `docs/cli/autocompletion.md`.

## Dependencies
Issue #8 (CLI Implementation).
