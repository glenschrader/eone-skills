---
description: "Check currently running tests in an Azure DevOps pipeline build"
argument-hint: "<build-id>"
allowed-tools: ["Bash", "Read"]
---

# Check Running Tests in ADO Pipeline

Monitor the live execution of tests in an Azure DevOps pipeline build. This command fetches real-time log output from actively running test suites.

**Build ID:** $ARGUMENTS

## Workflow:

1. **Validate Build ID**
   - If no build ID provided, prompt user for it
   - Build ID should be a number (e.g., 712539)

2. **Get Build Timeline**
   - Fetch the build timeline to identify test job status
   - Command:
   ```bash
   az rest \
     --url "https://dev.azure.com/quorumsoftware/QuorumSoftware/_apis/build/builds/<BUILD_ID>/timeline?api-version=7.1" \
     --resource "https://app.vssps.visualstudio.com"
   ```

3. **Parse Timeline for Test Jobs**
   - Extract test suite jobs (Base1-7, Gui3, etc.)
   - For each job, capture:
     - Name (e.g., "Base1", "Base2")
     - State (inProgress, completed, pending)
     - Result (if completed: succeeded, failed)
     - Log ID (if available)
     - Start time (if started)
   - Use this node.js to parse:
   ```javascript
   const data = JSON.parse(require('fs').readFileSync(0,'utf8'));
   data.records
     .filter(r => r.type === "Job" && (r.name.includes("Base") || r.name.includes("Gui")))
     .forEach(r => console.log(`${r.name}: ${r.state}, logId=${r.log?.id || 'none'}, startTime=${r.startTime || 'not started'}`));
   ```

4. **Check Test Progress for Each Suite**
   - For jobs with log IDs, fetch their current output
   - Command:
   ```bash
   az rest \
     --url "https://dev.azure.com/quorumsoftware/QuorumSoftware/_apis/build/builds/<BUILD_ID>/logs/<LOG_ID>?api-version=7.1" \
     --resource "https://app.vssps.visualstudio.com"
   ```

5. **Extract Test Statistics**
   - Search log output for test progress lines:
     - `tests passed: X, tests failed: Y, test skipped: Z`
   - Get the most recent count for each suite
   - Command:
   ```bash
   az rest --url "https://dev.azure.com/quorumsoftware/QuorumSoftware/_apis/build/builds/<BUILD_ID>/logs/<LOG_ID>?api-version=7.1" \
     --resource "https://app.vssps.visualstudio.com" | \
     grep -E "tests passed:|tests failed:" | tail -1
   ```

6. **Identify Any Failures**
   - If any suite shows `tests failed: N` where N > 0, highlight it
   - Search for error messages or stack traces
   - Command for checking failures:
   ```bash
   az rest --url "https://dev.azure.com/quorumsoftware/QuorumSoftware/_apis/build/builds/<BUILD_ID>/logs/<LOG_ID>?api-version=7.1" \
     --resource "https://app.vssps.visualstudio.com" | \
     grep -iE "failed|error" | tail -20
   ```

7. **Present Summary**
   - Format output in a clear, readable summary:
   ```markdown
   # Build <BUILD_ID> Test Status

   ## Test Suites Status:

   ✅ **Base1**: Running - 151 passed, 0 failed, 1 skipped
   ⏳ **Base2**: Initializing (no output yet)
   🏃 **Base3**: Started 2 min ago (no output yet)
   ...

   ## Summary:
   - X suites running with output
   - Y suites initializing
   - Z suites pending
   - **Total failures so far: 0** ✅

   ## Details:
   [For each suite with output, show recent test names and progress]
   ```

## Important Notes:

- **Log IDs only appear** once test jobs start producing output (after initialization)
- **Jobs without log IDs** are either pending or still in early initialization
- **Use dev.azure.com** for the logs endpoint (not visualstudio.com)
- **Timeline is authoritative** for finding which jobs exist and their status
- **Logs are live** and update as tests execute - you can run this command multiple times

## Configuration:

**Organization:** quorumsoftware
**Project:** QuorumSoftware
**Project ID:** ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1
**Main Pipeline ID:** 4308 (eONE)

## Usage Examples:

**Check specific build:**
```
/ado-pipelines:check-running-tests 712539
```

**Check latest running build:**
```
/ado-pipelines:check-running-tests
# Will prompt for build ID or find the latest in-progress build
```

## Tips:

- Run this command periodically to monitor test progress
- If no failures are shown, tests are passing so far
- Test suites can take 3-5 minutes to initialize before producing output
- If a suite has been running >1 hour without output, it may be stuck
- Link to full build: `https://quorumsoftware.visualstudio.com/QuorumSoftware/_build/results?buildId=<BUILD_ID>`
