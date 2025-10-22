---
name: ado-pipelines
description: Interact with Azure DevOps pipelines and builds using the Azure CLI DevOps extension. Use this skill when the user asks to check pipeline status, list builds, get build details, view test results, analyze test failures, detect flaky tests, or correlate test failures with code changes for the QuorumSoftware organization.
---

# ADO Pipelines Skill

## Purpose

This skill enables interaction with Azure DevOps (ADO) pipelines and builds using the Azure CLI with the DevOps extension. It provides commands and workflows for checking pipeline status, listing builds, retrieving build details, and viewing test run results from the QuorumSoftware Azure DevOps organization.

## When to Use

Use this skill when:
- User asks to check the status of pipeline runs or builds
- User requests information about recent builds
- User wants to query specific build definitions
- User asks about test results or test run status
- User wants to see which tests passed or failed
- User wants to investigate test failures or correlate failures with code changes
- User asks about what caused test failures
- User asks about test flakiness or intermittent test failures
- User wants to see test history across multiple builds
- User mentions "ADO", "Azure DevOps", "pipeline", "build status", "test results", "flaky tests", or "CI/CD"

## Prerequisites

The user has:
- Azure CLI installed (`az` command available)
- Azure DevOps extension installed (`az devops` commands available)
- Access to the QuorumSoftware Azure DevOps organization at https://quorumsoftware.visualstudio.com
- Authenticated to Azure DevOps (via `az login` or PAT token)

## Core Workflows

### Check Latest Pipeline Status

To check the status of the latest pipeline run:

1. Use the Azure CLI to list recent builds for a specific definition:
   ```bash
   az pipelines build list \
     --org https://quorumsoftware.visualstudio.com \
     --project QuorumSoftware \
     --definition-ids <DEFINITION_ID> \
     --top 5
   ```

2. Parse the JSON output to extract:
   - Build ID and number
   - Status (completed, inProgress, cancelling, etc.)
   - Result (succeeded, failed, canceled, partiallySucceeded)
   - Start time and finish time
   - Source branch
   - Requested by (user who triggered the build)

3. Present the information in a clear, readable format to the user

### Get Test Results for a Build

To retrieve test run results for a specific build:

1. First, get the build URI from the build information (format: `vstfs:///Build/Build/<BUILD_ID>`)

2. Use the Azure REST API to fetch test runs for that build:
   ```bash
   az rest --url "https://quorumsoftware.visualstudio.com/<PROJECT_ID>/_apis/test/runs?buildUri=<BUILD_URI>&api-version=7.0" \
     --resource "https://app.vssps.visualstudio.com"
   ```

3. Parse the JSON output to extract test run information:
   - Test run name (test suite name)
   - Total tests
   - Passed tests
   - Failed tests (totalTests - passedTests - notApplicableTests - incompleteTests)
   - Not applicable tests
   - Incomplete tests
   - Unanalyzed tests
   - State (Completed, InProgress, etc.)
   - Web access URL for detailed results

4. Present a summary showing:
   - Overall test statistics
   - Breakdown by test suite
   - Link to detailed results for failed suites

### Analyze Failed Tests and Correlate with Code Changes

To investigate test failures and identify potential causes related to code changes:

1. Get detailed failed test results for a specific test run:
   ```bash
   az rest --url "https://quorumsoftware.visualstudio.com/<PROJECT_ID>/_apis/test/runs/<RUN_ID>/results?outcomes=Failed&api-version=7.0" \
     --resource "https://app.vssps.visualstudio.com"
   ```

2. Extract key information from each failed test:
   - `automatedTestName`: The test method name
   - `automatedTestStorage`: The test class (full package path)
   - `errorMessage`: Brief error description
   - `stackTrace`: Full stack trace showing where the failure occurred
   - `failingSince`: When the test first started failing (build number and date)

3. Analyze the stack trace to identify:
   - Classes/methods involved in the failure
   - Exception types (e.g., NullPointerException, IllegalStateException)
   - Key error patterns (e.g., database issues, UI component issues, assertion failures)

4. Correlate with code changes:
   - Use `git diff` to compare the current branch with the base branch
   - Look for changes in files/classes mentioned in the stack trace
   - Identify recent commits that modified related code
   - Check if the test class itself was modified

5. Present findings:
   - List failed tests grouped by error pattern
   - Highlight potentially related code changes
   - Identify tests that started failing in this build vs. previously failing tests
   - Suggest which files/classes to investigate

### Detect Test Flakiness Across Builds and Branches

To properly identify flaky tests, compare test results across BOTH multiple builds AND multiple branches:

**Key Insight**: A test is only truly flaky if it fails intermittently across different branches, not just on your feature branch.

1. Get recent builds from MULTIPLE branches:
   ```bash
   # Get builds from current feature branch
   az pipelines build list \
     --org https://quorumsoftware.visualstudio.com \
     --project QuorumSoftware \
     --definition-ids <DEFINITION_ID> \
     --branch refs/heads/<FEATURE_BRANCH> \
     --top 5

   # Get builds from master/main branch
   az pipelines build list \
     --org https://quorumsoftware.visualstudio.com \
     --project QuorumSoftware \
     --definition-ids <DEFINITION_ID> \
     --branch refs/heads/master \
     --top 5
   ```

2. For each build, fetch test run summaries:
   ```bash
   az rest --url "https://quorumsoftware.visualstudio.com/<PROJECT_ID>/_apis/test/runs?buildUri=vstfs:///Build/Build/<BUILD_ID>&api-version=7.0" \
     --resource "https://app.vssps.visualstudio.com"
   ```

3. Compare test outcomes across branches:
   - **Truly flaky**: Fails intermittently on BOTH feature branch AND master
   - **Branch-specific failure**: Fails consistently on feature branch but passes on master (likely your code changes)
   - **Pre-existing failure**: Fails on master too (not caused by your changes)
   - **New regression**: Passes on master but fails on your feature branch (investigate your changes)

4. Track test outcomes within each branch:
   - Tests that pass sometimes and fail other times on the same branch
   - Tests that recently started failing
   - Failure rate per test suite

5. Present comprehensive flakiness analysis:
   - Tests that are flaky across ALL branches (ignore these)
   - Tests that fail only on your feature branch (investigate your code)
   - Tests that are consistently broken everywhere (pre-existing issues)
   - Tests with intermittent failures on your branch but stable on master (could be your changes OR environment)

### Common Configuration Values

**Definition IDs:**
- Main build pipeline (eONE): 4308

**Project ID:**
- ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1

### Output Interpretation

Build statuses include:
- `completed`: Build has finished
- `inProgress`: Build is currently running
- `cancelling`: Build is being canceled
- `notStarted`: Build queued but not started

Build results (for completed builds):
- `succeeded`: All tasks passed
- `failed`: One or more tasks failed
- `canceled`: Build was canceled
- `partiallySucceeded`: Some tasks failed but build continued

## Helper Scripts

### scripts/parse_build_status.js

A Node.js script to parse and format Azure DevOps build output into a readable summary. Execute this script by piping the Azure CLI JSON output:

```bash
az pipelines build list ... | node scripts/parse_build_status.js
```

The script formats build information into a concise, user-friendly summary.

### scripts/parse_test_results.js

A Node.js script to parse and format Azure DevOps test run results. Execute this script by piping the Azure REST API JSON output:

```bash
az rest --url "https://quorumsoftware.visualstudio.com/.../_apis/test/runs?..." | node scripts/parse_test_results.js
```

The script provides:
- Overall test statistics with pass rate
- Suites with failures (highlighted first)
- Suites with unanalyzed tests
- Summary of passed suites
- Direct links to detailed results for failed suites

### scripts/analyze_failed_tests.js

A Node.js script to analyze detailed failed test information and correlate with potential code changes. Execute this script by piping failed test results:

```bash
az rest --url "https://quorumsoftware.visualstudio.com/<PROJECT_ID>/_apis/test/runs/<RUN_ID>/results?outcomes=Failed&api-version=7.0" \
  --resource "https://app.vssps.visualstudio.com" | node scripts/analyze_failed_tests.js
```

The script provides:
- Failures grouped by error type (NullPointerException, Assertion Failures, UI issues, etc.)
- Identification of NEW failures vs. existing failures
- List of classes/packages involved in failures
- Suggested file paths to investigate
- Actionable next steps for debugging

### scripts/analyze_test_flakiness.js

A Node.js script to detect flaky tests by comparing test results across multiple builds on the SAME branch. Provide build IDs as arguments and pipe in an array of test run responses:

```bash
# First, collect test runs from multiple builds into a JSON array
# Then pipe to the script with build IDs as arguments
node scripts/analyze_test_flakiness.js 711240 710894 710877
```

The script provides:
- Flaky tests that pass sometimes and fail other times (with pass rate %)
- New failures that started in the most recent build
- Consistent failures across all builds
- Stable tests that consistently pass
- Build-by-build history for each test suite
- Recommendations on what to investigate first

### scripts/analyze_test_flakiness_cross_branch.js

A Node.js script to detect flaky tests by comparing test results across MULTIPLE BRANCHES. This is the recommended approach for proper flakiness detection:

```bash
# Input should be JSON with branch names as keys, test run arrays as values
# Example input structure:
# {
#   "feature/my-branch": [<test_runs>, <test_runs>, ...],
#   "master": [<test_runs>, <test_runs>, ...]
# }
node scripts/analyze_test_flakiness_cross_branch.js
```

The script provides:
- **Truly flaky tests**: Fail intermittently on ALL branches (environmental issues - can ignore)
- **New regressions**: Fail on feature branch but pass on master (YOUR CODE - investigate)
- **Branch-specific flakiness**: Flaky on feature but stable on master (could be your changes)
- **Pre-existing failures**: Fail on both branches (not your problem)
- **Stable tests**: Pass consistently everywhere
- Priority recommendations on what to investigate vs. ignore

## Tips

- Always specify `--org` and `--project` to avoid ambiguity
- Use `--top N` to limit results and reduce output
- Add `--status inProgress` to filter only running builds
- Add `--result succeeded` or `--result failed` to filter by outcome
- Use `--branch refs/heads/master` to filter builds for a specific branch

## Example Queries

Check latest builds:
```bash
az pipelines build list \
  --org https://quorumsoftware.visualstudio.com \
  --project QuorumSoftware \
  --definition-ids 4308 \
  --top 5
```

Check only running builds:
```bash
az pipelines build list \
  --org https://quorumsoftware.visualstudio.com \
  --project QuorumSoftware \
  --definition-ids 4308 \
  --status inProgress
```

Get specific build details:
```bash
az pipelines build show \
  --org https://quorumsoftware.visualstudio.com \
  --project QuorumSoftware \
  --id <BUILD_ID>
```

Get test results for a build:
```bash
az rest --url "https://quorumsoftware.visualstudio.com/ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1/_apis/test/runs?buildUri=vstfs:///Build/Build/711240&api-version=7.0" \
  --resource "https://app.vssps.visualstudio.com"
```
