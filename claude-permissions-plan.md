# Plan: Sample Claude Code Permissions Settings to Deny Dangerous Actions

## Overview

Generate sample permissions settings for Claude Code that deny dangerous operations. Based on research of Kilo Code's security model and Claude Code's hooks system.

## Context

### What I Found

**Kilo Code's Security Model:**
- Has an auto-approve system with risk levels (Low, Medium, High, Maximum)
- Command whitelist functionality for bash execution
- Categories: Read files (Medium), Edit files (High), Execute commands (High), Browser (Medium), MCP (Medium-High)
- Reference: [Auto-Approving Actions | Kilo Code Docs](https://kilo.ai/docs/features/auto-approving-actions)

**Claude Code's Hooks System:**
- Uses `hooks.json` to configure PreToolUse/PostToolUse hooks
- Python scripts can intercept tool usage
- Exit code 2 blocks execution
- The existing `security-guidance` plugin shows the pattern

## Implementation Plan

### 1. Create `hooks.json` Configuration

**File location:** `.claude/hooks.json` (user's project or home directory)

```json
{
  "description": "Dangerous operations blocker - denies harmful commands and file operations",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/dangerous_operations_blocker.py"
          }
        ]
      }
    ]
  }
}
```

### 2. Create Python Hook Script

**File location:** `.claude/hooks/dangerous_operations_blocker.py`

The script will check for dangerous operations and block them with exit code 2.

### 3. Dangerous Operations Categories (Based on Kilo Code + Security Best Practices)

#### A. Destructive File System Operations
- `rm -rf /`, `rm -rf .*`, `rm -rf ~`
- `format`, `fdisk`, `mkfs` commands
- `dd` with destructive flags

#### B. System Configuration Changes
- `/etc/` modifications
- System service manipulation (`systemctl`, `service`)
- `chmod 777`, `chown` on system paths

#### C. Network/Security Risks
- Port scanning tools
- Packet manipulation
- Unrestricted network access

#### D. Data Exfiltration Risks
- `curl`/`wget` sending data to unknown endpoints
- Base64 encoding sensitive data for exfiltration

#### E. Code Injection Vulnerabilities (from security-guidance plugin)
- `eval(`, `exec(` in Python/JavaScript
- `child_process.exec(` in Node.js
- `new Function()` in JavaScript
- `pickle` in Python
- `dangerouslySetInnerHTML` in React
- `.innerHTML =` with dynamic content

#### F. Git Operations That Could Lose Data
- `git reset --hard`
- `git clean -fd`
- `git push --force`

#### G. Database Operations
- `DROP DATABASE`, `DELETE FROM` without WHERE
- Database truncate commands

## Files to Create

1. **`.claude/hooks.json`** - Hook configuration
2. **`.claude/hooks/dangerous_operations_blocker.py`** - Main blocking script

## Optional Enhancements

1. **Allowlist configuration** - `~/.claude/allowed_operations.json` for exceptions
2. **Logging** - Log blocked attempts for audit
3. **Customizable risk levels** - Allow users to adjust strictness

## References

- Kilo Code Auto-Approve docs: https://kilo.ai/docs/features/auto-approving-actions
- Existing security-guidance plugin: `.claude/plugins/marketplaces/claude-plugins-official/plugins/security-guidance/`
- Hookify plugin for rule patterns: `.claude/plugins/marketplaces/claude-plugins-official/plugins/hookify/`
