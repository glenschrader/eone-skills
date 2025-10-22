# @Me Token Workaround

## Problem
The `@Me` token in Azure DevOps CLI commands may fail with:
```
ERROR: Could not resolve identity: @Me
```

## Solution
Use explicit email addresses instead of `@Me`:

### Examples:

❌ **Don't use:**
```bash
az repos pr list --repository eONE --creator "@Me" --status active
az repos pr list --repository eONE --reviewer "@Me" --status active
```

✅ **Use instead:**
```bash
az repos pr list --repository eONE --creator "glen.schrader@quorumsoftware.com" --status active
az repos pr list --repository eONE --reviewer "glen.schrader@quorumsoftware.com" --status active
```

## Setup Required
Ensure Azure DevOps defaults are configured:
```bash
az devops configure --defaults organization=https://dev.azure.com/quorumsoftware project=QuorumSoftware
```

## Why This Happens
The `@Me` token requires proper Azure DevOps context and authentication. In some environments, it may not resolve correctly even when authenticated.
