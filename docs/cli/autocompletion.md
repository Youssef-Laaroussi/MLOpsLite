# 🐚 Shell Autocompletion Guide

> **Component:** `docs/cli/autocompletion.md`  
> **Milestone:** M8 — Documentation & Examples (Issue #34)

---

## Overview

The `mlite` CLI provides shell completion support for commands, subcommands, and options across all standard terminal shells (Bash, Zsh, and Fish). With autocompletion enabled, pressing <kbd>Tab</kbd> automatically suggests command names, option flags, and subcommands.

---

## Installation by Shell

### 1. Bash

#### Temporary (Current Shell Session Only):
```bash
eval "$(_MLITE_COMPLETE=bash_source mlite)"
```

#### Permanent (Saved to `~/.bashrc`):
```bash
# Append completion script to ~/.bashrc
_MLITE_COMPLETE=bash_source mlite >> ~/.bash_completion.d/mlite.sh || \
  echo 'eval "$(_MLITE_COMPLETE=bash_source mlite)"' >> ~/.bashrc

# Reload your shell configuration
source ~/.bashrc
```

---

### 2. Zsh (macOS & Linux)

#### Temporary:
```zsh
eval "$(_MLITE_COMPLETE=zsh_source mlite)"
```

#### Permanent (Saved to `~/.zshrc`):
```zsh
# Ensure compinit is enabled in ~/.zshrc:
autoload -Uz compinit && compinit

# Append autocompletion script
echo 'eval "$(_MLITE_COMPLETE=zsh_source mlite)"' >> ~/.zshrc

# Reload configuration
source ~/.zshrc
```

---

### 3. Fish Shell

#### Temporary:
```fish
eval (env _MLITE_COMPLETE=fish_source mlite)
```

#### Permanent:
```fish
# Save completions file to fish configuration directory
_MLITE_COMPLETE=fish_source mlite > ~/.config/fish/completions/mlite.fish
```

---

## Verification

To verify that shell autocompletion is active:

1. Type `mlite ` and press <kbd>Tab</kbd> twice:
   ```
   alert            -- Manage alerts and incident notifications
   api-key          -- Manage API keys for CI/CD and automation
   audit            -- Inspect immutable compliance and operational audit logs
   config           -- View and manage CLI configuration
   data             -- Manage datasets, schemas, and DVC sync
   deploy           -- Deploy a registered model version to Docker container
   deployment       -- Manage active model deployments
   experiment       -- Manage experiments and training runs
   init             -- Initialize a new ML project with standard structure
   login            -- Log in to MLite and store credentials locally
   logout           -- Log out and clear stored credentials
   model            -- Manage model registry and promotions
   monitor          -- Monitor feature drift and model performance
   rollback         -- Roll back a model to a previous version
   rollback-policy  -- Manage auto-rollback policies
   status           -- Check the status of all platform services
   user             -- Manage user accounts (Admin only)
   whoami           -- Display authenticated user profile and permissions
   ```

2. Type `mlite model ` and press <kbd>Tab</kbd> to see model registry subcommands:
   ```
   compare   list      promote   register
   ```
