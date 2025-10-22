# ADO Pipelines Claude Code Skill

A comprehensive Claude Code skill for interacting with Azure DevOps (ADO) pipelines and builds using the Azure CLI DevOps extension.

## Features

- **Pipeline Status Monitoring**: Check the status of the latest pipeline runs
- **Test Results Analysis**: View detailed test results and summaries
- **Failure Investigation**: Analyze failed tests and correlate with code changes
- **Flakiness Detection**: Identify flaky tests by comparing results across branches
- **Code Change Correlation**: Link test failures to specific code modifications

## Prerequisites

- Azure CLI installed (`az` command)
- Azure DevOps extension installed (`az devops`)
- Authenticated to Azure DevOps
- Node.js (for helper scripts)

## Installation

1. Copy the `ado-pipelines` directory to your Claude Code skills folder:
   - Windows: `C:\Users\<USERNAME>\.claude\skills\`
   - macOS/Linux: `~/.claude/skills/`

2. The skill will be automatically loaded by Claude Code

## Usage

Simply ask Claude Code questions like:

- "Check the status of the latest pipeline run"
- "Show me test results for build 711240"
- "What tests failed and why?"
- "Is this test flaky?"
- "Are there any new test failures on my branch?"

## Components

### SKILL.md

Main skill definition with workflows for:
- Checking pipeline status
- Analyzing test results
- Investigating test failures
- Detecting flakiness across builds and branches

### Helper Scripts

Located in `scripts/`:

- **parse_build_status.js**: Format build output into readable summaries
- **parse_test_results.js**: Display test run results with statistics
- **analyze_failed_tests.js**: Analyze detailed failure information
- **analyze_test_flakiness.js**: Detect flaky tests within a branch
- **analyze_test_flakiness_cross_branch.js**: Detect flakiness across multiple branches (recommended)

### References

Located in `references/`:

- **az_devops_commands.md**: Comprehensive Azure CLI DevOps command reference

## Configuration

The skill is pre-configured for the QuorumSoftware organization. To use with a different organization:

1. Update the organization URL in `SKILL.md`
2. Update the project ID and name
3. Update definition IDs for your pipelines

## Examples

### Check Latest Build Status

```
You: Check the status of the latest pipeline run

Claude: [Fetches and displays latest build information with test results]
```

### Analyze Test Failures

```
You: What tests failed in the latest build?

Claude: [Shows categorized failures by error type, new vs existing failures, and suggests investigation steps]
```

### Detect Flaky Tests

```
You: Is this test flaky?

Claude: [Compares test results across branches and identifies if it's truly flaky or a new regression]
```

## Contributing

This skill was created for use with the QuorumSoftware Azure DevOps organization but can be adapted for other organizations.

## License

This is a custom Claude Code skill. Use and modify as needed for your organization.

## Author

Created using Claude Code skill-creator
