# worktree-create

Git worktree creation command for parallel feature development.

## Commands to run

When this slash command is invoked, execute the following commands in order:

1. Create `.tree` directory if it doesn't exist:
   ```bash
   mkdir -p .tree
   ```

2. Create the git worktree with new branch:
   ```bash
   git worktree add -b <branch-name> .tree/<branch-name>
   ```

3. Navigate to the worktree directory:
   ```bash
   cd .tree/<branch-name>
   ```

4. Call the `/feature-dev` slash command from Claude to start implementing your changes

Where `<branch-name>` is the argument provided by the user.

The `/feature-dev` command (from the official `feature-dev` plugin) provides guided feature development with codebase understanding and architecture focus.

## Usage

```
/worktree-create <branch-name>
```

**Arguments:**
- `branch-name` - Name for the new branch (letters, numbers, hyphens, and underscores only)

## Example

```bash
/worktree-create feature-add-search
```

## See also

- `/worktree-merge` - Merge a worktree back into main
- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
