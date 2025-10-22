---
name: ado-pr
description: Manage Azure DevOps pull requests including creating, reviewing, updating, merging PRs, managing reviewers, and handling PR policies. Use this skill when the user asks to create PRs, review PRs, approve/reject PRs, add reviewers, check PR status, or manage the PR lifecycle for the QuorumSoftware organization.
---

# ADO Pull Request Management Skill

This skill helps you manage the complete pull request lifecycle in Azure DevOps using the Azure CLI DevOps extension.

## ⚠️ Critical Requirements for REST API Calls

When using `az rest` with Azure DevOps APIs (especially for PR comments), you MUST:

1. **Add the `--resource` parameter**: `--resource "499b84ac-1321-427f-aa17-267ca6975798"`
   - This is the Azure DevOps resource ID required for authentication
   - Without it, you'll get authentication errors or HTML sign-in pages

2. **Use `--output-file` instead of `-o json`**: To avoid Unicode encoding errors
   - PR comments often contain special characters (∞, →, etc.) that cause codec errors
   - Save to file, then parse with Node.js for proper Unicode handling

**Example of correct REST API usage:**
```bash
az rest \
  --url "https://dev.azure.com/quorumsoftware/QuorumSoftware/_apis/git/repositories/eONE/pullRequests/118608/threads?api-version=7.0" \
  --resource "499b84ac-1321-427f-aa17-267ca6975798" \
  --output-file pr_comments.json
```

## Prerequisites

- Azure CLI with the azure-devops extension installed
- Authenticated to Azure DevOps (run `az login` and `az devops login`)
- Default organization and project configured (or will be prompted)
- Node.js installed (for parsing PR comments with Unicode characters)

## Core Capabilities

### 1. Listing Pull Requests

#### View All Active PRs
```bash
# List all active PRs in the repository
az repos pr list --repository eONE --status active

# List all PRs (including completed and abandoned)
az repos pr list --repository eONE --status all

# List PRs with specific filters
az repos pr list --repository eONE --status active --source-branch "feature/my-branch"
az repos pr list --repository eONE --status active --target-branch "master"

# List PRs created by specific user
az repos pr list --repository eONE --creator "user@domain.com"

# List PRs where you are a reviewer
az repos pr list --repository eONE --reviewer "@Me"

# Limit results
az repos pr list --repository eONE --status active --top 10
```

#### View PR Details
```bash
# Show full details of a PR
az repos pr show --id <PR_ID>

# Show specific PR and open in browser
az repos pr show --id <PR_ID> --open

# Get PR details in table format
az repos pr show --id <PR_ID> -o table
```

### 2. Creating Pull Requests

#### Basic PR Creation
```bash
# Create a simple PR
az repos pr create \
  --repository eONE \
  --source-branch "feature/my-feature" \
  --target-branch "master" \
  --title "Add new feature" \
  --description "This PR adds the new feature functionality"

# Create PR and open in browser
az repos pr create \
  --repository eONE \
  --source-branch "feature/my-feature" \
  --target-branch "master" \
  --title "Feature: Add user authentication" \
  --description "Implements OAuth2 authentication" \
  --open
```

#### PR with Work Items
```bash
# Create PR linked to work items
az repos pr create \
  --repository eONE \
  --source-branch "feature/123456-new-feature" \
  --target-branch "master" \
  --title "Feature: New functionality" \
  --description "Implementation details here" \
  --work-items 123456 789012 \
  --transition-work-items true
```

#### PR with Reviewers
```bash
# Create PR with required and optional reviewers
az repos pr create \
  --repository eONE \
  --source-branch "feature/my-feature" \
  --target-branch "master" \
  --title "PR Title" \
  --description "PR Description" \
  --required-reviewers "user1@domain.com" "user2@domain.com" \
  --optional-reviewers "user3@domain.com"
```

#### Draft PR
```bash
# Create a draft/work-in-progress PR
az repos pr create \
  --repository eONE \
  --source-branch "feature/wip-feature" \
  --target-branch "master" \
  --title "WIP: New feature" \
  --description "Work in progress" \
  --draft true
```

#### PR with Auto-Complete
```bash
# Create PR with auto-complete enabled
az repos pr create \
  --repository eONE \
  --source-branch "feature/ready-feature" \
  --target-branch "master" \
  --title "Feature ready for merge" \
  --description "All tests passing" \
  --auto-complete true \
  --delete-source-branch true \
  --squash true
```

#### PR with Labels
```bash
# Create PR with labels
az repos pr create \
  --repository eONE \
  --source-branch "bugfix/issue-123" \
  --target-branch "master" \
  --title "Fix: Critical bug" \
  --description "Bug fix details" \
  --labels "bug" "critical" "hotfix"
```

### 3. Updating Pull Requests

#### Update PR Details
```bash
# Update PR title and description
az repos pr update --id <PR_ID> \
  --title "New PR Title" \
  --description "Updated description" "Additional line"

# Convert draft to ready
az repos pr update --id <PR_ID> --draft false

# Convert to draft
az repos pr update --id <PR_ID> --draft true
```

#### Enable Auto-Complete
```bash
# Enable auto-complete for PR
az repos pr update --id <PR_ID> \
  --auto-complete true \
  --delete-source-branch true \
  --squash true \
  --merge-commit-message "Merged feature XYZ"

# Disable auto-complete
az repos pr update --id <PR_ID> --auto-complete false
```

#### Change PR Status
```bash
# Abandon a PR
az repos pr update --id <PR_ID> --status abandoned

# Reactivate an abandoned PR
az repos pr update --id <PR_ID> --status active

# Complete/merge a PR (bypass policies if authorized)
az repos pr update --id <PR_ID> \
  --status completed \
  --bypass-policy true \
  --bypass-policy-reason "Emergency hotfix deployment"
```

### 4. Managing Reviewers

#### Add Reviewers
```bash
# Add reviewers to existing PR
az repos pr reviewer add --id <PR_ID> \
  --reviewers "user1@domain.com" "user2@domain.com"

# Add required reviewers
az repos pr reviewer add --id <PR_ID> \
  --reviewers "senior.dev@domain.com" \
  --is-required true
```

#### List Reviewers
```bash
# List all reviewers for a PR
az repos pr reviewer list --id <PR_ID>

# List reviewers with their votes
az repos pr reviewer list --id <PR_ID> -o table
```

#### Remove Reviewers
```bash
# Remove reviewer from PR
az repos pr reviewer remove --id <PR_ID> \
  --reviewers "user@domain.com"
```

### 5. Viewing PR Comments and Threads

The Azure CLI doesn't have direct commands for PR comments, but you can use the REST API.

**IMPORTANT**: When using `az rest` with Azure DevOps URLs, you MUST include the `--resource` parameter to avoid authentication issues. The resource ID for Azure DevOps is `499b84ac-1321-427f-aa17-267ca6975798`.

Additionally, when dealing with Unicode characters (like ∞) in the output, you should save to a file using `--output-file` instead of using `-o json` to avoid encoding errors.

```bash
# Get all comment threads for a PR (save to file to avoid encoding issues)
az rest \
  --url "https://dev.azure.com/{organization}/{project}/_apis/git/repositories/{repository}/pullRequests/<PR_ID>/threads?api-version=7.0" \
  --resource "499b84ac-1321-427f-aa17-267ca6975798" \
  --output-file pr_comments.json

# For QuorumSoftware organization and eONE repository:
az rest \
  --url "https://dev.azure.com/quorumsoftware/QuorumSoftware/_apis/git/repositories/eONE/pullRequests/<PR_ID>/threads?api-version=7.0" \
  --resource "499b84ac-1321-427f-aa17-267ca6975798" \
  --output-file pr_comments.json

# Parse the output using Node.js for better handling
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('pr_comments.json', 'utf8'));
const threads = data.value || [];
console.log(\`Total: \${threads.length}, Active: \${threads.filter(t => t.status === 'active').length}, Resolved: \${threads.filter(t => t.status === 'fixed').length}\`);
"

# Alternative: If you want to use --query directly (may fail with special characters)
az rest \
  --url "https://dev.azure.com/quorumsoftware/QuorumSoftware/_apis/git/repositories/eONE/pullRequests/<PR_ID>/threads?api-version=7.0" \
  --resource "499b84ac-1321-427f-aa17-267ca6975798" \
  --output-file pr_comments.json
```

#### Parsing PR Comments with Node.js

To display comments in a readable format, save the following as `parse_pr_comments.js`:

```javascript
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('pr_comments.json', 'utf8'));
const threads = data.value || [];

console.log(`Total threads: ${threads.length}`);
console.log(`Active (unresolved): ${threads.filter(t => t.status === 'active').length}`);
console.log(`Resolved: ${threads.filter(t => t.status === 'fixed').length}`);
console.log('');

threads.forEach((thread, i) => {
  const status = thread.status || 'unknown';
  const context = thread.threadContext || {};
  const filePath = context.filePath || 'General comment';
  const line = context.rightFileStart?.line || '';

  console.log(`\n=== Thread ${i+1} [${status.toUpperCase()}] ===`);
  if (line) {
    console.log(`Location: ${filePath}:${line}`);
  } else {
    console.log(`Location: ${filePath}`);
  }

  const comments = thread.comments || [];
  comments.forEach(comment => {
    if (comment.commentType === 'text') {
      const author = comment.author?.displayName || 'Unknown';
      const content = comment.content || '';
      const date = (comment.publishedDate || '').substring(0, 10);
      console.log(`  [${author}] ${date}`);
      const displayContent = content.length > 300 ? content.substring(0, 300) + '...' : content;
      console.log(`  ${displayContent}`);
    }
  });
});
```

Then run: `node parse_pr_comments.js`

#### Understanding Comment Thread Structure
- **Thread**: A conversation about code or the PR in general
- **Status**: active (unresolved), fixed (resolved), closed, unknown
- **threadContext**: Location in code (file path, line number)
- **comments**: Array of comments in the thread
  - **author**: Person who made the comment
  - **content**: Comment text (can include markdown)
  - **publishedDate**: When comment was posted
  - **commentType**: text, system, codeChange

#### Common Comment Queries

```bash
# Get PR comments (save to file first to avoid encoding issues)
PR_ID=<PR_ID>
az rest \
  --url "https://dev.azure.com/quorumsoftware/QuorumSoftware/_apis/git/repositories/eONE/pullRequests/${PR_ID}/threads?api-version=7.0" \
  --resource "499b84ac-1321-427f-aa17-267ca6975798" \
  --output-file pr_comments_${PR_ID}.json

# Then parse with Node.js
node parse_pr_comments.js

# Or get a quick summary
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('pr_comments_${PR_ID}.json', 'utf8'));
const threads = data.value || [];
const active = threads.filter(t => t.status === 'active').length;
const resolved = threads.filter(t => t.status === 'fixed').length;
console.log(\`Total: \${threads.length}, Active: \${active}, Resolved: \${resolved}\`);
"
```

### 6. Voting on Pull Requests

```bash
# Approve a PR
az repos pr set-vote --id <PR_ID> --vote approve

# Approve with suggestions
az repos pr set-vote --id <PR_ID> --vote approve-with-suggestions

# Request changes (wait for author)
az repos pr set-vote --id <PR_ID> --vote wait-for-author

# Reject a PR
az repos pr set-vote --id <PR_ID> --vote reject

# Reset your vote
az repos pr set-vote --id <PR_ID> --vote reset
```

### 7. Managing Work Items

#### Link Work Items to PR
```bash
# Add work items to existing PR
az repos pr work-item add --id <PR_ID> --work-items 123456 789012

# List work items linked to PR
az repos pr work-item list --id <PR_ID>

# Remove work item from PR
az repos pr work-item remove --id <PR_ID> --work-items 123456
```

### 8. PR Policies

#### Check Policy Status
```bash
# List all policies for a PR
az repos pr policy list --id <PR_ID>

# Check policy status in table format
az repos pr policy list --id <PR_ID> -o table

# Queue policy evaluation (re-run checks)
az repos pr policy queue --id <PR_ID> --evaluation-id <POLICY_EVALUATION_ID>
```

### 9. Checking Out PRs Locally

```bash
# Checkout a PR branch locally
az repos pr checkout --id <PR_ID>

# This will:
# 1. Fetch the PR source branch
# 2. Create a local branch
# 3. Checkout the branch
```

## Common Workflows

### Workflow 1: Create PR from Current Branch
```bash
# Get current branch name
CURRENT_BRANCH=$(git branch --show-current)

# Create PR from current branch to master
PR_ID=$(az repos pr create \
  --repository eONE \
  --source-branch "$CURRENT_BRANCH" \
  --target-branch "master" \
  --title "Feature: $(echo $CURRENT_BRANCH | sed 's/feature\///')" \
  --description "Implementation of feature from branch $CURRENT_BRANCH" \
  --auto-complete true \
  --delete-source-branch true \
  --open \
  --query "pullRequestId" -o tsv)

echo "Created PR #$PR_ID"
```

### Workflow 2: Complete PR Review with Comments
```bash
# 1. View PR details
PR_ID=<PR_ID>
az repos pr show --id $PR_ID

# 2. Check existing comments/discussions
az rest \
  --url "https://dev.azure.com/quorumsoftware/QuorumSoftware/_apis/git/repositories/eONE/pullRequests/${PR_ID}/threads?api-version=7.0" \
  --resource "499b84ac-1321-427f-aa17-267ca6975798" \
  --output-file pr_comments_${PR_ID}.json

# 3. Check for unresolved comments using Node.js
UNRESOLVED=$(node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('pr_comments_${PR_ID}.json', 'utf8'));
const active = data.value.filter(t => t.status === 'active').length;
console.log(active);
")
echo "Unresolved comments: $UNRESOLVED"

# 4. Display all comments
node parse_pr_comments.js

# 5. Check out the PR locally
az repos pr checkout --id $PR_ID

# 6. Review code and test changes
./gradlew test

# 7. Approve the PR (if all looks good)
az repos pr set-vote --id $PR_ID --vote approve
```

### Workflow 3: Create PR with Full Configuration
```bash
# Extract work item ID from branch name
BRANCH=$(git branch --show-current)
WORK_ITEM=$(echo $BRANCH | grep -oP '\d{7}')

# Create comprehensive PR
az repos pr create \
  --repository eONE \
  --source-branch "$BRANCH" \
  --target-branch "master" \
  --title "[WI $WORK_ITEM] Feature implementation" \
  --description "## Summary" "Implementation details" "" "## Test Plan" "- Unit tests added" "- Integration tests passing" \
  --work-items $WORK_ITEM \
  --transition-work-items true \
  --required-reviewers "tech.lead@domain.com" \
  --optional-reviewers "team.member@domain.com" \
  --auto-complete true \
  --delete-source-branch true \
  --squash true \
  --labels "feature" "ready-for-review" \
  --open
```

### Workflow 4: Batch Review Multiple PRs
```bash
# List all PRs assigned to me for review
PR_IDS=$(az repos pr list --repository eONE --reviewer "@Me" --status active --query "[].pullRequestId" -o tsv)

# Review and approve each
for PR_ID in $PR_IDS; do
  echo "Reviewing PR #$PR_ID"
  az repos pr show --id $PR_ID --query "{title:title, author:createdBy.displayName, source:sourceRefName}"

  # Approve after review
  read -p "Approve PR #$PR_ID? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    az repos pr set-vote --id $PR_ID --vote approve
    echo "Approved PR #$PR_ID"
  fi
done
```

### Workflow 5: Emergency Hotfix PR
```bash
# Create hotfix PR with bypass policy
az repos pr create \
  --repository eONE \
  --source-branch "hotfix/critical-bug" \
  --target-branch "master" \
  --title "HOTFIX: Critical production bug" \
  --description "## Issue" "Production issue description" "" "## Fix" "Fix details" \
  --required-reviewers "senior.dev@domain.com" \
  --labels "hotfix" "critical" \
  --open

# After approval, complete with bypass
az repos pr update --id <PR_ID> \
  --status completed \
  --bypass-policy true \
  --bypass-policy-reason "Critical production hotfix approved by tech lead" \
  --delete-source-branch true
```

### Workflow 6: Reactivate Abandoned PR
```bash
# Find abandoned PRs
az repos pr list --repository eONE --status abandoned

# Reactivate a PR
az repos pr update --id <PR_ID> --status active

# Update with current changes
git checkout <PR_BRANCH>
git rebase master
git push --force-with-lease

# Notify reviewers
az repos pr reviewer add --id <PR_ID> --reviewers "reviewer@domain.com"
```

## Advanced Features

### Using JMESPath Queries
```bash
# Get PR IDs for all active PRs targeting master
az repos pr list --repository eONE --status active --target-branch master --query "[].pullRequestId" -o tsv

# Get PR title and author
az repos pr list --repository eONE --status active --query "[].{id:pullRequestId, title:title, author:createdBy.displayName}" -o table

# Find PRs with merge conflicts
az repos pr list --repository eONE --status active --query "[?mergeStatus=='conflicts'].{id:pullRequestId, title:title, source:sourceRefName}" -o table

# Count PRs by status
az repos pr list --repository eONE --status all --query "length([?status=='active'])" -o tsv
```

### PR Status Values
- **active**: PR is open and under review
- **completed**: PR has been merged
- **abandoned**: PR was closed without merging
- **all**: Include all statuses

### Vote Values
- **approve** (10): Approve the PR
- **approve-with-suggestions** (5): Approve but suggest improvements
- **wait-for-author** (-5): Request changes from author
- **reject** (-10): Reject the PR
- **reset** (0): Remove your vote

### Merge Strategies
- **--squash true**: Squash all commits into one
- **--delete-source-branch true**: Auto-delete branch after merge
- **--auto-complete true**: Auto-merge when policies pass
- **--transition-work-items true**: Move linked work items to next state

## Tips and Best Practices

1. **IMPORTANT - Command Parameters**: Most PR commands only accept `--org` (not `--project`):
   - **Accept both `--org` and `--project`**: `az repos pr list`, `az repos pr create`
   - **Only accept `--org`**: `az repos pr show`, `az repos pr update`, `az repos pr set-vote`, `az repos pr reviewer`, `az repos pr work-item`, `az repos pr checkout`
   - Set default organization: `az devops configure --defaults organization=https://dev.azure.com/YourOrg`
   - When in doubt, use only `--org` parameter

2. **PR Descriptions**: Use multi-line descriptions with markdown for clarity:
   ```bash
   --description "## Summary" "Brief overview" "" "## Changes" "- Change 1" "- Change 2"
   ```

3. **Auto-Complete**: Enable for PRs that are ready but waiting on builds:
   ```bash
   --auto-complete true --delete-source-branch true --squash true
   ```

4. **Draft PRs**: Use for work-in-progress to get early feedback:
   ```bash
   --draft true
   ```

5. **Work Item Linking**: Always link PRs to work items for traceability:
   ```bash
   --work-items <WORK_ITEM_ID> --transition-work-items true
   ```

6. **Required vs Optional Reviewers**: Use required reviewers for mandatory approvals:
   ```bash
   --required-reviewers "lead@domain.com" --optional-reviewers "team@domain.com"
   ```

7. **Labels**: Use consistent labeling for PR categorization:
   ```bash
   --labels "feature" "high-priority" "breaking-change"
   ```

8. **Query Formatting**: Use `-o table` for readable output, `-o tsv` for scripting:
   ```bash
   az repos pr list --repository eONE -o table
   ```

9. **Checkout PRs**: Review PRs locally before approving:
   ```bash
   az repos pr checkout --id <PR_ID>
   ./gradlew test
   ```

## Common PR Commands Reference

```bash
# Quick reference for common operations

# List my PRs
az repos pr list --repository eONE --creator "@Me" --status active

# List PRs I need to review
az repos pr list --repository eONE --reviewer "@Me" --status active

# Create PR from current branch
az repos pr create --repository eONE --source-branch "$(git branch --show-current)" --target-branch master --title "My PR" --open

# Show PR details
az repos pr show --id <PR_ID>

# Approve PR
az repos pr set-vote --id <PR_ID> --vote approve

# Request changes
az repos pr set-vote --id <PR_ID> --vote wait-for-author

# Add reviewer
az repos pr reviewer add --id <PR_ID> --reviewers "user@domain.com"

# Enable auto-complete
az repos pr update --id <PR_ID> --auto-complete true --delete-source-branch true --squash true

# Complete PR (bypass policies)
az repos pr update --id <PR_ID> --status completed --bypass-policy true --bypass-policy-reason "Approved by lead"

# Abandon PR
az repos pr update --id <PR_ID> --status abandoned

# Checkout PR locally
az repos pr checkout --id <PR_ID>

# Link work item
az repos pr work-item add --id <PR_ID> --work-items <WORK_ITEM_ID>
```

## Troubleshooting

- **"Can't derive appropriate Azure AD resource"**: When using `az rest` with Azure DevOps URLs, you MUST add `--resource "499b84ac-1321-427f-aa17-267ca6975798"`. This is the Azure DevOps resource ID required for authentication.

- **"'charmap' codec can't encode character"**: This occurs when PR comments contain Unicode characters (like ∞, →, etc.). Solution: Use `--output-file` instead of `-o json` to save the output to a file, then parse with Node.js which handles Unicode properly.

- **"unrecognized arguments: --project"**: Most PR commands only accept `--org`, not `--project`. Only `az repos pr list` and `az repos pr create` accept `--project`. Use `--org` parameter or set default organization with `az devops configure --defaults organization=https://dev.azure.com/YourOrg`

- **Authentication Issues**: Run `az devops login` or `az login --use-device-code`. If you get a sign-in page HTML response instead of JSON, your authentication token may have expired.

- **Organization Not Set**: Use `--org` parameter or set default with `az devops configure`

- **PR Creation Fails**: Ensure source branch exists remotely and has commits ahead of target

- **Cannot Complete PR**: Check if all required policies have passed

- **Merge Conflicts**: Rebase your branch on target branch and force push

- **Cannot Bypass Policy**: Requires "Bypass policies when completing pull requests" permission

- **Reviewer Not Found**: Use exact email or display name from Azure DevOps

- **Auto-Complete Not Working**: Ensure all required policies are enabled and passing

### Common Error Patterns

```bash
# ERROR: 'charmap' codec can't encode character '\u221e'
# SOLUTION: Use --output-file and Node.js parsing
az rest \
  --url "https://dev.azure.com/quorumsoftware/..." \
  --resource "499b84ac-1321-427f-aa17-267ca6975798" \
  --output-file output.json
node -e "const data = require('./output.json'); console.log(data);"

# ERROR: Authentication token expired (returns HTML sign-in page)
# SOLUTION: Re-authenticate
az login
az devops login

# ERROR: Can't derive Azure AD resource
# SOLUTION: Always add --resource parameter for az rest commands
az rest --url "..." --resource "499b84ac-1321-427f-aa17-267ca6975798"
```

## Integration with Work Items Skill

Combine this skill with the ado-work-items skill for complete workflow:

```bash
# 1. Create work item
WORK_ITEM_ID=$(az boards work-item create --title "New feature" --type "User Story" --query "id" -o tsv)

# 2. Create branch
SOURCE_COMMIT=$(az repos ref list --repository eONE --filter "heads/master" --query "[0].objectId" -o tsv)
az repos ref create --name "heads/feature/${WORK_ITEM_ID}-new-feature" --object-id "$SOURCE_COMMIT" --repository eONE

# 3. Make changes and commit
git checkout "feature/${WORK_ITEM_ID}-new-feature"
# ... make changes ...
git commit -m "Implement feature #${WORK_ITEM_ID}"
git push

# 4. Create PR linked to work item
az repos pr create \
  --repository eONE \
  --source-branch "feature/${WORK_ITEM_ID}-new-feature" \
  --target-branch "master" \
  --title "[${WORK_ITEM_ID}] New feature" \
  --work-items $WORK_ITEM_ID \
  --transition-work-items true \
  --auto-complete true \
  --delete-source-branch true \
  --open
```

## Reference Links

- [Azure DevOps CLI PR Reference](https://learn.microsoft.com/en-us/cli/azure/repos/pr)
- [Pull Request Documentation](https://learn.microsoft.com/en-us/azure/devops/repos/git/pull-requests)
- [Branch Policies](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies)
