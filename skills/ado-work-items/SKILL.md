---
name: ado-work-items
description: Manage Azure DevOps work items, create new work items, link them to branches, and create pull requests. Use this skill when the user asks to view work items, create bugs/tasks/stories, create branches for work items, or manage work item lifecycle for the QuorumSoftware organization.
---

# ADO Work Items Management Skill

This skill helps you interact with Azure DevOps work items, create new work items, and manage branches linked to work items using the Azure CLI DevOps extension.

## Prerequisites

- Azure CLI with the azure-devops extension installed
- Authenticated to Azure DevOps (run `az login` and `az devops login`)
- Default organization and project configured (or will be prompted)

## Core Capabilities

### 1. Viewing Work Items

#### List My Work Items
Query work items assigned to you or matching specific criteria:

```bash
# Get work items assigned to me
az boards query --wiql "Select [System.Id], [System.Title], [System.State], [System.WorkItemType] From WorkItems Where [System.AssignedTo] = @Me AND [System.State] <> 'Closed' order by [System.ChangedDate] desc"

# Get recent work items (last 30 days)
az boards query --wiql "Select [System.Id], [System.Title], [System.State], [System.WorkItemType] From WorkItems Where [System.ChangedDate] >= @Today - 30 order by [System.ChangedDate] desc"

# Get work items by type (Bug, Task, User Story, etc.)
az boards query --wiql "Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = 'Bug' AND [System.State] = 'Active'"

# Get work items for a specific iteration
az boards query --wiql "Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.IterationPath] = 'ProjectName\\Sprint 1'"
```

#### Show Work Item Details
Get full details for a specific work item:

```bash
# Show work item with all details
az boards work-item show --id <WORK_ITEM_ID>

# Show specific fields only (IMPORTANT: must use --expand none when using --fields)
az boards work-item show --id <WORK_ITEM_ID> --expand none --fields System.Title,System.State,System.AssignedTo,System.Description

# Open work item in browser
az boards work-item show --id <WORK_ITEM_ID> --open
```

### 2. Creating Work Items

#### Create Different Work Item Types

**Create a Bug:**
```bash
az boards work-item create \
  --title "Bug title here" \
  --type Bug \
  --description "Detailed description of the bug" \
  --assigned-to "user@domain.com" \
  --fields "System.Tags=bug,urgent" "Microsoft.VSTS.TCM.ReproSteps=Steps to reproduce"
```

**Create a Task:**
```bash
az boards work-item create \
  --title "Task title here" \
  --type Task \
  --description "Task description" \
  --assigned-to "user@domain.com" \
  --area "ProjectName\\AreaPath" \
  --iteration "ProjectName\\Sprint 1"
```

**Create a User Story:**
```bash
az boards work-item create \
  --title "As a user, I want to..." \
  --type "User Story" \
  --description "User story details" \
  --fields "Microsoft.VSTS.Common.AcceptanceCriteria=Acceptance criteria here"
```

**Create a Feature:**
```bash
az boards work-item create \
  --title "Feature title" \
  --type Feature \
  --description "Feature description" \
  --area "ProjectName\\AreaPath"
```

#### Common Fields for Work Items
- `--title`: Title of the work item (required)
- `--type`: Bug, Task, User Story, Feature, Epic, etc. (required)
- `--description`: Detailed description
- `--assigned-to`: Email or name of assignee
- `--area`: Area path (e.g., "ProjectName\\Team\\Component")
- `--iteration`: Iteration path (e.g., "ProjectName\\Sprint 1")
- `--fields`: Custom fields in format "field=value" (space-separated)
- `--discussion`: Add a comment to the work item
- `--open`: Open in browser after creation

#### Useful Custom Fields
- `System.Tags`: Tags (comma-separated)
- `Microsoft.VSTS.Common.Priority`: Priority (1-4)
- `Microsoft.VSTS.Common.Severity`: Severity for bugs (1-4)
- `Microsoft.VSTS.Common.AcceptanceCriteria`: Acceptance criteria for stories
- `Microsoft.VSTS.TCM.ReproSteps`: Reproduction steps for bugs
- `Microsoft.VSTS.Scheduling.StoryPoints`: Story points
- `Microsoft.VSTS.Scheduling.RemainingWork`: Remaining work hours

### 3. Updating Work Items

```bash
# Update work item state
az boards work-item update --id <WORK_ITEM_ID> --fields "System.State=Active"

# Update assignee
az boards work-item update --id <WORK_ITEM_ID> --assigned-to "user@domain.com"

# Add tags
az boards work-item update --id <WORK_ITEM_ID> --fields "System.Tags=tag1,tag2"

# Add a comment/discussion
az boards work-item update --id <WORK_ITEM_ID> --discussion "Status update or comment here"

# Update multiple fields
az boards work-item update --id <WORK_ITEM_ID> \
  --fields "System.State=Resolved" "Microsoft.VSTS.Common.ResolvedReason=Fixed" \
  --discussion "Fixed the issue"
```

### 4. Creating Branches Linked to Work Items

#### Create a Feature Branch from Master
```bash
# Step 1: Get the commit ID of the source branch (e.g., master)
SOURCE_COMMIT=$(az repos ref list --repository <REPO_NAME> --filter "heads/master" --query "[0].objectId" -o tsv)

# Step 2: Create the new branch
az repos ref create \
  --name "heads/feature/<WORK_ITEM_ID>-description" \
  --object-id $SOURCE_COMMIT \
  --repository <REPO_NAME>

# Step 3: Link the branch to the work item (done via commit message or manually in ADO UI)
```

#### Complete Branch Creation Workflow
```bash
# 1. Get current commit from master
SOURCE_COMMIT=$(az repos ref list --repository eONE --filter "heads/master" --query "[0].objectId" -o tsv)

# 2. Create branch with work item in name
WORK_ITEM_ID=123456
BRANCH_NAME="heads/feature/${WORK_ITEM_ID}-short-description"
az repos ref create --name "$BRANCH_NAME" --object-id "$SOURCE_COMMIT" --repository eONE

# 3. Check out the branch locally
git fetch origin
git checkout "feature/${WORK_ITEM_ID}-short-description"

# 4. When committing, include work item reference to auto-link
git commit -m "Your commit message #${WORK_ITEM_ID}"
```

### 5. Linking Work Items to Pull Requests

```bash
# Create PR with work item link
az repos pr create \
  --title "PR Title" \
  --description "PR Description" \
  --source-branch "feature/branch-name" \
  --target-branch "master" \
  --work-items <WORK_ITEM_ID>

# Add work item to existing PR
az repos pr work-item add --id <PR_ID> --work-items <WORK_ITEM_ID>

# List work items linked to PR
az repos pr work-item list --id <PR_ID>
```

### 6. Work Item Relations

```bash
# Link work items (parent-child, related, etc.)
az boards work-item relation add \
  --id <WORK_ITEM_ID> \
  --relation-type parent \
  --target-id <PARENT_WORK_ITEM_ID>

# Common relation types: parent, child, related, predecessor, successor

# Remove relation
az boards work-item relation remove \
  --id <WORK_ITEM_ID> \
  --relation-type parent \
  --target-id <PARENT_WORK_ITEM_ID>
```

## Common Workflows

### Workflow 1: Start New Feature Work
```bash
# 1. Create a user story
WORK_ITEM_ID=$(az boards work-item create \
  --title "Implement new feature" \
  --type "User Story" \
  --description "Feature details" \
  --assigned-to "@Me" \
  --query "id" -o tsv)

# 2. Get master branch commit
SOURCE_COMMIT=$(az repos ref list --filter "heads/master" --query "[0].objectId" -o tsv)

# 3. Create feature branch
az repos ref create \
  --name "heads/feature/${WORK_ITEM_ID}-new-feature" \
  --object-id "$SOURCE_COMMIT"

# 4. Check out locally
git fetch origin
git checkout "feature/${WORK_ITEM_ID}-new-feature"

echo "Ready to work on work item ${WORK_ITEM_ID}"
```

### Workflow 2: Bug Fix with Work Item
```bash
# 1. Create bug work item
BUG_ID=$(az boards work-item create \
  --title "Fix: Issue description" \
  --type Bug \
  --description "Bug details and repro steps" \
  --fields "Microsoft.VSTS.Common.Severity=2" "Microsoft.VSTS.Common.Priority=1" \
  --query "id" -o tsv)

# 2. Create bugfix branch
SOURCE_COMMIT=$(az repos ref list --filter "heads/master" --query "[0].objectId" -o tsv)
az repos ref create \
  --name "heads/bugfix/${BUG_ID}-bug-description" \
  --object-id "$SOURCE_COMMIT"

# 3. Check out and work on fix
git fetch origin
git checkout "bugfix/${BUG_ID}-bug-description"

echo "Bug ${BUG_ID} ready to fix"
```

### Workflow 3: Query and Triage Work Items
```bash
# Get all unassigned bugs
az boards query --wiql "Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] = 'Bug' AND [System.AssignedTo] = '' AND [System.State] <> 'Closed'"

# Assign bugs to team members
az boards work-item update --id <BUG_ID> --assigned-to "user@domain.com" --fields "System.State=Active"
```

## Tips and Best Practices

1. **Branch Naming Convention**: Use format `feature/<WORK_ITEM_ID>-short-description` or `bugfix/<WORK_ITEM_ID>-description`

2. **Auto-linking**: Include `#<WORK_ITEM_ID>` in commit messages to automatically link commits to work items

3. **WIQL Queries**: Work Item Query Language (WIQL) is powerful for filtering work items. Use `@Me`, `@Today`, `@CurrentIteration` for dynamic queries

4. **Default Configuration**: Set defaults to avoid repetitive parameters:
   ```bash
   az devops configure --defaults organization=https://dev.azure.com/YourOrg project=YourProject
   ```

5. **JSON Output**: Use `-o json` and `--query` for parsing output in scripts:
   ```bash
   az boards work-item show --id 123 --query "fields.'System.Title'" -o tsv
   ```

6. **Batch Operations**: Create multiple work items or branches using shell loops:
   ```bash
   for title in "Task 1" "Task 2" "Task 3"; do
     az boards work-item create --title "$title" --type Task
   done
   ```

## Common WIQL Query Examples

```sql
-- My active work items
Select [System.Id], [System.Title], [System.State]
From WorkItems
Where [System.AssignedTo] = @Me
AND [System.State] <> 'Closed'
AND [System.State] <> 'Removed'
order by [System.ChangedDate] desc

-- Work items in current sprint
Select [System.Id], [System.Title], [System.State]
From WorkItems
Where [System.IterationPath] = @CurrentIteration
AND [System.State] <> 'Closed'

-- High priority bugs
Select [System.Id], [System.Title], [Microsoft.VSTS.Common.Priority]
From WorkItems
Where [System.WorkItemType] = 'Bug'
AND [Microsoft.VSTS.Common.Priority] <= 2
AND [System.State] = 'Active'

-- Recently completed work
Select [System.Id], [System.Title], [System.ClosedDate]
From WorkItems
Where [System.AssignedTo] = @Me
AND [System.State] = 'Closed'
AND [System.ClosedDate] >= @Today - 7
```

## Troubleshooting

- **Authentication Issues**: Run `az devops login` or `az login --use-device-code`
- **Organization Not Set**: Use `--org` parameter or set default with `az devops configure`
- **Field Names**: Use `System.FieldName` format for built-in fields
- **Branch Already Exists**: Check existing branches with `az repos ref list`
- **Work Item Types**: Check available types with `az boards work-item show --id <ANY_ID> --query "fields.'System.WorkItemType'"`
- **"The expand parameter can not be used with the fields parameter"**: When using `--fields` to show specific fields, you MUST also include `--expand none` to avoid this error

## Reference Links

- [Azure DevOps CLI Work Items](https://learn.microsoft.com/en-us/cli/azure/boards/work-item)
- [WIQL Syntax](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
- [Work Item Field Reference](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/work-item-field)