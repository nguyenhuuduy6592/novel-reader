# worktree-merge

Git worktree merge command for merging a feature branch back into main.

## Commands to run

When this slash command is invoked, execute the following commands in order:

1. Kill any node processes running in the worktree (Windows):
   ```bash
   powershell -NoProfile -Command "Get-WmiObject Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*<worktree-path>*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
   ```
   Or on Unix-like systems:
   ```bash
   pkill -f "node.*<worktree-path>" 2>/dev/null || true
   ```

2. Switch to main branch:
   ```bash
   git checkout main
   ```

3. Merge the branch:
   ```bash
   git merge <folder-name>
   ```

4. Remove the worktree:
   ```bash
   git worktree remove .tree/<folder-name>
   ```

5. Delete the branch (normal delete, then force if needed):
   ```bash
   git branch -d <folder-name> || git branch -D <folder-name>
   ```

Where `<folder-name>` is the argument provided by the user, and `<worktree-path>` is the full absolute path to `.tree/<folder-name>`.

## Usage

```
/worktree-merge <folder-name>
```

**Arguments:**
- `folder-name` - Name of the worktree folder (same as the branch name) in `.tree/`

## Example

```bash
/worktree-merge feature-add-search
```

## Merge conflicts

If merge conflicts occur during step 3 (`git merge`), resolve them manually, then run:

```bash
git worktree remove .tree/<folder-name>
git branch -D <folder-name>
```

## Prerequisites

- Must be run from the main working directory (not from within a worktree)
- The worktree must exist in `.tree/<folder-name>/`
- Recommended to commit all changes in the worktree before merging

**Note**: Node processes running in the worktree (e.g., `npm run dev`) will be automatically terminated before merging.

## See also

- `worktree:create` - Create a new worktree for feature development
- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
