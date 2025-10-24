---
name: ado-analyze-failed-suite
description: Analyze testSuiteFailed results across branches to identify true failures vs pre-existing issues
---

# Analyze testSuiteFailed Test Results

You are analyzing the testSuiteFailed test suite to determine which failures are:
- New regressions introduced by the current branch
- Pre-existing failures that also exist on master
- Tests that have been fixed

## Your Task

Execute the following analysis workflow:

### Step 1: Get Current Branch Test Results

1. Get the current branch name from git
2. Get the latest build for the current branch:
   ```bash
   az pipelines build list \
     --org https://quorumsoftware.visualstudio.com \
     --project QuorumSoftware \
     --definition-ids 4308 \
     --branch refs/heads/<CURRENT_BRANCH> \
     --top 1
   ```
3. Get test results for testSuiteFailed from that build:
   ```bash
   az rest --url "https://quorumsoftware.visualstudio.com/ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1/_apis/test/runs?buildUri=vstfs:///Build/Build/<BUILD_ID>&api-version=7.0" \
     --resource "https://app.vssps.visualstudio.com"
   ```
4. Find the testSuiteFailed run ID and get failed test details:
   ```bash
   az rest --url "https://quorumsoftware.visualstudio.com/ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1/_apis/test/runs/<RUN_ID>/results?outcomes=Failed&api-version=7.0" \
     --resource "https://app.vssps.visualstudio.com"
   ```

### Step 2: Get Master Branch Test Results

1. Get the latest build from master that ran testSuiteFailed:
   ```bash
   az pipelines build list \
     --org https://quorumsoftware.visualstudio.com \
     --project QuorumSoftware \
     --definition-ids 4308 \
     --branch refs/heads/master \
     --top 10
   ```
2. Find a build that has `"failed": "True"` in templateParameters
3. Get test results for testSuiteFailed from that master build
4. Get all test results (both passed and failed) to see what tests exist:
   ```bash
   az rest --url "https://quorumsoftware.visualstudio.com/ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1/_apis/test/runs/<MASTER_RUN_ID>/results?api-version=7.0" \
     --resource "https://app.vssps.visualstudio.com"
   ```

### Step 3: Get Previous Build on Current Branch

1. Get the previous build on the current branch (2nd in the list):
   ```bash
   az pipelines build list \
     --org https://quorumsoftware.visualstudio.com \
     --project QuorumSoftware \
     --definition-ids 4308 \
     --branch refs/heads/<CURRENT_BRANCH> \
     --top 5
   ```
2. Get testSuiteFailed results from that previous build
3. This shows the trend: are failures increasing or decreasing?

### Step 4: Analyze and Compare

Compare the test results:

1. **Create a list of failed tests on current branch**:
   - Extract `automatedTestStorage` + `automatedTestName` for each failed test
   - Note the `failingSince` field to see when each test started failing

2. **Create a list of all tests on master branch**:
   - Extract `automatedTestStorage` + `automatedTestName` for ALL tests (passed and failed)
   - This tells you which tests are even present on master

3. **Categorize each failed test**:
   - **NEW REGRESSION**: Test fails on current branch but doesn't exist in master's testSuiteFailed at all
   - **PRE-EXISTING**: Test fails on both current branch and master
   - **FIXED IN CURRENT BRANCH**: Test that was in previous build but is now passing
   - **FLAKY**: Test that appears/disappears across builds

### Step 5: Check Code Changes

For NEW REGRESSION tests:
1. Use `git diff master...HEAD --name-only` to see changed files
2. Check if test files were modified
3. Look for related command/fetch changes that might affect test data

### Step 6: Present Analysis

Present results in this format:

```
## testSuiteFailed Analysis

### Current Branch Status
- Build: <BUILD_NUMBER> (<BUILD_ID>)
- Branch: <BRANCH_NAME>
- Total tests in suite: X
- Failed: Y
- Passed: Z

### Master Branch Comparison
- Build: <BUILD_NUMBER> (<BUILD_ID>)
- Total tests in suite: A
- These are different tests: <note if test composition differs>

### Progress Tracking
Previous build on this branch: X failures
Current build on this branch: Y failures
**Improvement: X → Y** (fixed Z tests)

### NEW REGRESSIONS (Tests that fail on your branch but don't exist on master):
1. **TestClassName.testMethod()**
   - Error: <brief error message>
   - Failing since: Build <BUILD_ID> (<DATE>)
   - Status: NEW - introduced by your changes

### PRE-EXISTING FAILURES (Also fail on master):
1. **TestClassName.testMethod()**
   - Error: <brief error message>
   - Status: Pre-existing, not your problem

### FIXED TESTS (Were failing, now passing):
1. **TestClassName.testMethod()**
   - Previously failed in build <BUILD_ID>
   - Now passing! 🎉

### Recommendations:
- Focus on fixing: <list NEW REGRESSION tests>
- Can ignore: <list PRE-EXISTING tests>
- Great progress on: <list FIXED tests>
```

## Important Notes

- testSuiteFailed runs tests that previously failed in other suites
- The composition of tests can differ between branches
- A test not being present on master's testSuiteFailed means it passes on master
- Look at multiple builds to establish patterns, not just one build
- Use `failingSince` field to track when failures started
- **CRITICAL**: Just because a test appears in testSuiteFailed doesn't mean it's old - it could be NEW to that suite!

## Context Values

- Project ID: ecaedfc6-005f-4ee9-aa66-6da8c71a6ad1
- Pipeline Definition ID: 4308
- Organization: https://quorumsoftware.visualstudio.com
- Project Name: QuorumSoftware