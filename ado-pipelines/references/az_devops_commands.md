# Azure DevOps CLI Commands Reference

## Build Commands

### List Builds

```bash
az pipelines build list \
  --org <ORGANIZATION_URL> \
  --project <PROJECT_NAME> \
  [--definition-ids <IDS>] \
  [--branch <BRANCH_NAME>] \
  [--status <STATUS>] \
  [--result <RESULT>] \
  [--top <N>]
```

**Parameters:**
- `--org`: Azure DevOps organization URL (required)
- `--project`: Project name (required)
- `--definition-ids`: Space-separated list of build definition IDs
- `--branch`: Filter by branch (e.g., `refs/heads/master`)
- `--status`: Filter by status (`notStarted`, `inProgress`, `completed`, `cancelling`, `postponed`, `all`)
- `--result`: Filter by result (`succeeded`, `failed`, `canceled`, `partiallySucceeded`)
- `--top`: Maximum number of builds to return

### Show Build Details

```bash
az pipelines build show \
  --org <ORGANIZATION_URL> \
  --project <PROJECT_NAME> \
  --id <BUILD_ID>
```

### Get Build Logs

```bash
az pipelines build log \
  --org <ORGANIZATION_URL> \
  --project <PROJECT_NAME> \
  --id <BUILD_ID>
```

### Queue a Build

```bash
az pipelines build queue \
  --org <ORGANIZATION_URL> \
  --project <PROJECT_NAME> \
  --definition-id <DEFINITION_ID> \
  [--branch <BRANCH_NAME>] \
  [--commit-id <COMMIT_ID>]
```

## Output Format

By default, Azure CLI returns JSON output. The typical build object structure:

```json
{
  "id": 12345,
  "buildNumber": "20250122.1",
  "status": "completed",
  "result": "succeeded",
  "queueTime": "2025-01-22T10:00:00Z",
  "startTime": "2025-01-22T10:01:00Z",
  "finishTime": "2025-01-22T10:15:00Z",
  "sourceBranch": "refs/heads/feature/my-feature",
  "sourceVersion": "abc123def456...",
  "requestedFor": {
    "displayName": "John Doe",
    "uniqueName": "john.doe@example.com"
  },
  "definition": {
    "id": 4308,
    "name": "Main Build Pipeline"
  },
  "project": {
    "name": "QuorumSoftware"
  }
}
```

## Status Values

- `notStarted`: Build is queued but not started
- `inProgress`: Build is currently running
- `completed`: Build has finished
- `cancelling`: Build is being canceled
- `postponed`: Build has been postponed

## Result Values (for completed builds)

- `succeeded`: All tasks completed successfully
- `failed`: One or more tasks failed
- `canceled`: Build was canceled by user
- `partiallySucceeded`: Some tasks failed but build continued

## Authentication

Azure CLI must be authenticated before using DevOps commands:

```bash
az login
```

Or using a Personal Access Token (PAT):

```bash
az devops login --org <ORGANIZATION_URL>
```

## Test Run Commands

### Get Test Runs for a Build

Use the Azure REST API to retrieve test runs associated with a specific build:

```bash
az rest \
  --url "https://quorumsoftware.visualstudio.com/<PROJECT_ID>/_apis/test/runs?buildUri=<BUILD_URI>&api-version=7.0" \
  --resource "https://app.vssps.visualstudio.com"
```

**Parameters:**
- `<PROJECT_ID>`: The project GUID (e.g., `ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1`)
- `<BUILD_URI>`: The build URI in format `vstfs:///Build/Build/<BUILD_ID>`
- `api-version`: API version (use `7.0`)

**Example:**
```bash
az rest \
  --url "https://quorumsoftware.visualstudio.com/ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1/_apis/test/runs?buildUri=vstfs:///Build/Build/711240&api-version=7.0" \
  --resource "https://app.vssps.visualstudio.com"
```

### Test Run Object Structure

```json
{
  "count": 21,
  "value": [
    {
      "id": 2021498,
      "name": "testSuiteNoDB",
      "state": "Completed",
      "totalTests": 21241,
      "passedTests": 21238,
      "notApplicableTests": 3,
      "incompleteTests": 0,
      "unanalyzedTests": 0,
      "isAutomated": true,
      "url": "https://..._apis/test/Runs/2021498",
      "webAccessUrl": "https://..._TestManagement/Runs?runId=2021498&_a=runCharts"
    }
  ]
}
```

### Calculating Failed Tests

Failed tests are not directly reported but can be calculated:

```
failedTests = totalTests - passedTests - notApplicableTests - incompleteTests
```

### Test Run States

- `Completed`: Test run has finished
- `InProgress`: Test run is currently executing
- `Aborted`: Test run was aborted
- `Waiting`: Test run is waiting to start

## QuorumSoftware Specific

- Organization URL: `https://quorumsoftware.visualstudio.com`
- Project: `QuorumSoftware`
- Project ID: `ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1`
- Known Definition IDs:
  - 4308: Main build pipeline (eONE)

### Common Test Suites in eONE Pipeline

The eONE build pipeline (4308) typically runs these test suites:
- NoDB: Database-free unit tests (~21,000 tests)
- Dev: Development environment tests
- Server: Server-side tests
- Library: Library/shared code tests
- Api: API tests
- Costing: Costing module tests
- Base1-7: Base test suites (split for parallelization)
- Gui1-6: GUI test suites (split for parallelization)
- Long: Long-running tests
- Failed: Re-run of previously failed tests

### Get Detailed Test Results for a Run

Retrieve individual test results from a specific test run:

```bash
az rest \
  --url "https://quorumsoftware.visualstudio.com/<PROJECT_ID>/_apis/test/runs/<RUN_ID>/results?api-version=7.0" \
  --resource "https://app.vssps.visualstudio.com"
```

**Optional Query Parameters:**
- `outcomes`: Filter by outcome (e.g., `Failed`, `Passed`, `NotExecuted`)
- `$top`: Limit number of results returned
- `$skip`: Skip first N results (for pagination)

**Example - Get only failed tests:**
```bash
az rest \
  --url "https://quorumsoftware.visualstudio.com/ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1/_apis/test/runs/2021506/results?outcomes=Failed&api-version=7.0" \
  --resource "https://app.vssps.visualstudio.com"
```

### Test Result Object Structure

Each test result contains:

```json
{
  "id": 100014,
  "automatedTestName": "testPublishAndInstallArchive()",
  "automatedTestStorage": "com.entero.enterovision.components.library.TestInstallReport",
  "automatedTestType": "JUnit",
  "outcome": "Failed",
  "state": "Completed",
  "errorMessage": "Brief error description...",
  "stackTrace": "Full stack trace...",
  "startedDate": "2025-10-20T22:47:11Z",
  "completedDate": "2025-10-20T22:47:27.867Z",
  "durationInMs": 16867.0,
  "failingSince": {
    "build": {
      "id": 711240,
      "number": "20251020.1"
    },
    "date": "2025-10-20T22:47:27.867Z"
  }
}
```

**Key Fields:**
- `automatedTestName`: Test method name
- `automatedTestStorage`: Full test class path (used to locate the test file)
- `errorMessage`: Short description of the failure
- `stackTrace`: Complete stack trace for debugging
- `failingSince`: When the test first started failing (useful for identifying new vs. existing failures)
- `outcome`: Test outcome (Passed, Failed, Inconclusive, etc.)

### Correlating Test Failures with Code Changes

To investigate test failures in relation to code changes:

1. Get failed test details including stack traces
2. Extract class/package names from:
   - `automatedTestStorage` (test class)
   - Stack trace lines (classes involved in the failure)
3. Convert package names to file paths:
   - `com.entero.enterovision.hibernate.SecurityRole` → `modules/*/src/**/java/com/entero/enterovision/hibernate/SecurityRole.java`
4. Use git commands to check for changes:
   - `git diff master -- <file_path>`
   - `git log --oneline -- <file_path>`
5. Look for patterns:
   - Tests failing in modified classes
   - Common error types across multiple tests
   - New failures vs. pre-existing failures

## Analyzing Test Flakiness Across Builds

### Get Recent Builds for a Branch

List recent builds for a specific branch to analyze test history:

```bash
az pipelines build list \
  --org https://quorumsoftware.visualstudio.com \
  --project QuorumSoftware \
  --definition-ids 4308 \
  --branch refs/heads/<BRANCH_NAME> \
  --top 10
```

**Example:**
```bash
az pipelines build list \
  --org https://quorumsoftware.visualstudio.com \
  --project QuorumSoftware \
  --definition-ids 4308 \
  --branch refs/heads/feature/1760812-jpa-conversion-round-19 \
  --top 10
```

### Comparing Test Results Across Builds

To detect flaky tests:

1. Get build IDs from recent builds
2. For each build, fetch test run summaries
3. Compare test suite outcomes across builds

**Workflow:**
```bash
# Get last 5 builds
az pipelines build list --org ... --top 5

# For each build, get test runs
az rest --url "https://quorumsoftware.visualstudio.com/<PROJECT_ID>/_apis/test/runs?buildUri=vstfs:///Build/Build/<BUILD_ID>&api-version=7.0" \
  --resource "https://app.vssps.visualstudio.com"

# Compare results to identify:
# - Tests that pass in some builds but fail in others (flaky)
# - Tests that consistently fail (real issues)
# - Tests that recently started failing (new regressions)
```

### Flakiness Indicators

**IMPORTANT**: To properly detect flakiness, you MUST compare test results across different branches, not just multiple builds on the same branch.

**Truly Flaky Test** (can ignore):
- Fails intermittently on MULTIPLE branches (both feature branch AND master)
- Pass rate varies across builds on all branches
- Failures occur without related code changes in any branch
- The test suite name doesn't appear in git diff results

**New Regression** (investigate your code):
- Consistently fails (or flaky) on your feature branch
- BUT passes consistently on master/main branch
- Likely caused by your code changes
- The `failingSince` build is on your branch

**Pre-Existing Failure** (not your problem):
- Fails on BOTH your feature branch AND master
- Was already failing before your branch was created
- Not caused by your changes (safe to ignore)

**Branch-Specific Flakiness** (might be your code):
- Flaky on your feature branch
- BUT stable (passes consistently) on master
- Could indicate your changes are affecting test stability
- Worth investigating

**Real Failure on Your Branch**:
- Consistently fails across all recent builds on your feature branch
- Passes on master
- Started failing after specific code changes
- The failure is in classes that were modified
