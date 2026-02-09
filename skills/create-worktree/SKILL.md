---
name: create-worktree
description: This skill should be used when the user asks to "create a worktree", "new worktree", "add worktree", "set up worktree", "worktree for branch", "worktree for work item", or mentions creating a git worktree for a feature branch or ADO work item. Creates a new git worktree with proper setup for eONE projects.
---

# Create Git Worktree for eONE Projects

This skill creates a new git worktree based on origin/master with all necessary project setup.

## When to Use

- User wants to create a new worktree for a feature branch
- User needs to work on multiple branches simultaneously
- User asks to set up a new working directory for a branch
- User wants to create a worktree for an Azure DevOps work item

## Workflow

### Step 1: Gather Information

Ask the user for:
1. **Branch name** (required) - The name for the git branch
2. **ADO Work Item ID** (optional) - Azure DevOps work item number (e.g., 123456)

The directory naming follows this pattern:
- **With work item:** `eONE-{work-item-id}-{branch-name}` (e.g., `eONE-123456-publishing-artifacts`)
- **Without work item:** `eONE-{branch-name}` (e.g., `eONE-publishing-artifacts`)

### Step 2: Fetch Latest Origin

Fetch the latest changes from origin/master to ensure the worktree starts from the most recent code:

```bash
git fetch origin master
```

### Step 3: Create the Worktree

Create the worktree in a sibling directory. The branch name should include the work item ID when provided, following the pattern `feature/{work-item-id}-{branch-name}`:

**With ADO Work Item ID:**
```bash
git worktree add ../eONE-{work-item-id}-{branch-name} -b feature/{work-item-id}-{branch-name} origin/master
```

**Without Work Item ID:**
```bash
git worktree add ../eONE-{branch-name} -b {branch-name} origin/master
```

**Examples:**

For branch `publishing-artifacts` with work item `1780513`:
```bash
git worktree add ../eONE-1780513-publishing-artifacts -b feature/1780513-publishing-artifacts origin/master
```

For branch `publishing-artifacts` without work item:
```bash
git worktree add ../eONE-publishing-artifacts -b publishing-artifacts origin/master
```

### Step 4: Push Branch and Set Up Remote Tracking

Push the new branch to origin and set up tracking for its own remote branch (not origin/master):

**With ADO Work Item ID:**
```bash
cd ../eONE-{work-item-id}-{branch-name}
git push -u origin feature/{work-item-id}-{branch-name}
```

**Without Work Item ID:**
```bash
cd ../eONE-{branch-name}
git push -u origin {branch-name}
```

This ensures the branch tracks its own remote branch (e.g., `origin/feature/1780513-publishing-artifacts`) rather than `origin/master`.

### Step 5: Copy gradle.properties

Copy the `gradle.properties` file from an existing worktree to the new one. This file contains database connection settings and Azure DevOps credentials required for builds.

Look for `gradle.properties` in these locations (in order of preference):
1. Current working directory
2. `D:/eONE-email-cli/gradle.properties` (common main repo location)
3. Any sibling `eONE-*` directory

**With Work Item ID:**
```bash
cp "D:/eONE-email-cli/gradle.properties" "D:/eONE-{work-item-id}-{branch-name}/gradle.properties"
```

**Without Work Item ID:**
```bash
cp "D:/eONE-email-cli/gradle.properties" "D:/eONE-{branch-name}/gradle.properties"
```

### Step 6: Confirm Success

Report the following to the user:
- Worktree location (full path)
- Branch name (e.g., `feature/1780513-publishing-artifacts`)
- Remote tracking branch (e.g., `origin/feature/1780513-publishing-artifacts`)
- ADO Work Item ID (if provided)
- Base commit (from origin/master)
- Confirmation that gradle.properties was copied

## Important Notes

- The worktree directory is created as a sibling to the current repository
- Directory naming: `eONE-{work-item-id}-{branch-name}` or `eONE-{branch-name}`
- Branch naming with work item: `feature/{work-item-id}-{branch-name}` (e.g., `feature/1780513-publishing-artifacts`)
- The branch is pushed and set up to track its own remote branch (e.g., `origin/feature/1780513-publishing-artifacts`), NOT `origin/master`
- The `gradle.properties` file is gitignored and must be copied manually
- Each worktree shares the same `.git` directory, saving disk space
- The ADO work item ID in both the directory and branch name helps associate the work with its ticket

## Error Handling

**Branch already exists:** If the branch already exists, ask the user if they want to:
1. Use the existing branch (without `-b` flag)
2. Choose a different branch name

**Worktree directory exists:** If the directory already exists, inform the user and ask how to proceed.

**gradle.properties not found:** Warn the user that they need to create `gradle.properties` manually from `gradle.properties.sample`.
