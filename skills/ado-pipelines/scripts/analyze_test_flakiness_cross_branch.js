#!/usr/bin/env node

/**
 * Analyze test flakiness across multiple builds AND branches
 *
 * This script compares test results from different branches to identify:
 * - Truly flaky tests (fail intermittently across all branches)
 * - Branch-specific failures (fail on feature branch but pass on master)
 * - Pre-existing failures (fail on master too)
 *
 * Usage: node analyze_test_flakiness_cross_branch.js
 *
 * Input format (via stdin): JSON object with branch names as keys
 * {
 *   "feature/my-branch": [<test_runs_build1>, <test_runs_build2>, ...],
 *   "master": [<test_runs_build1>, <test_runs_build2>, ...]
 * }
 */

const readline = require('readline');

let inputData = '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  inputData += line;
});

rl.on('close', () => {
  try {
    // Input should be an object with branch names as keys, arrays of test runs as values
    const branchData = JSON.parse(inputData);

    if (typeof branchData !== 'object' || Array.isArray(branchData)) {
      console.error('Expected an object with branch names as keys');
      process.exit(1);
    }

    const branches = Object.keys(branchData);
    if (branches.length < 2) {
      console.error('Please provide test data from at least 2 branches');
      process.exit(1);
    }

    console.log('\n=== Cross-Branch Test Flakiness Analysis ===\n');
    console.log(`Comparing branches: ${branches.join(', ')}\n`);

    // Analyze each branch
    const branchAnalysis = {};

    branches.forEach((branchName) => {
      const buildTestRuns = branchData[branchName];
      const suiteHistory = {};

      buildTestRuns.forEach((testRunsResponse) => {
        const testRuns = testRunsResponse.value || [];

        testRuns.forEach((run) => {
          const suiteName = run.name;

          if (!suiteHistory[suiteName]) {
            suiteHistory[suiteName] = {
              total: 0,
              passed: 0,
              failed: 0,
              results: []
            };
          }

          const failed = (run.totalTests || 0) - (run.passedTests || 0) - (run.notApplicableTests || 0) - (run.incompleteTests || 0);
          const hasFailed = failed > 0;

          suiteHistory[suiteName].total++;
          if (hasFailed) {
            suiteHistory[suiteName].failed++;
          } else {
            suiteHistory[suiteName].passed++;
          }

          suiteHistory[suiteName].results.push({
            passed: !hasFailed,
            failedCount: failed,
            totalTests: run.totalTests || 0
          });
        });
      });

      branchAnalysis[branchName] = suiteHistory;
    });

    // Get all unique test suite names across all branches
    const allSuites = new Set();
    Object.values(branchAnalysis).forEach((suites) => {
      Object.keys(suites).forEach((suite) => allSuites.add(suite));
    });

    // Categorize tests
    const trulyFlaky = [];
    const branchSpecificFailures = [];
    const preExistingFailures = [];
    const newRegressions = [];
    const stableTests = [];

    allSuites.forEach((suiteName) => {
      const branchResults = {};
      let hasDataInAllBranches = true;

      branches.forEach((branch) => {
        if (!branchAnalysis[branch][suiteName]) {
          hasDataInAllBranches = false;
          return;
        }

        const history = branchAnalysis[branch][suiteName];
        branchResults[branch] = {
          passRate: history.total > 0 ? ((history.passed / history.total) * 100).toFixed(1) : 100,
          passed: history.passed,
          failed: history.failed,
          total: history.total,
          isFlaky: history.passed > 0 && history.failed > 0,
          alwaysFails: history.failed === history.total,
          alwaysPasses: history.passed === history.total
        };
      });

      if (!hasDataInAllBranches) return;

      // Determine category
      const featureBranch = branches.find(b => !b.includes('master') && !b.includes('main'));
      const masterBranch = branches.find(b => b.includes('master') || b.includes('main')) || branches[0];

      const featureResult = branchResults[featureBranch];
      const masterResult = branchResults[masterBranch];

      // Truly flaky: intermittent failures on BOTH branches
      if (featureResult.isFlaky && masterResult.isFlaky) {
        trulyFlaky.push({
          name: suiteName,
          branches: branchResults
        });
      }
      // Branch-specific: fails on feature but passes on master
      else if ((featureResult.alwaysFails || featureResult.isFlaky) && masterResult.alwaysPasses) {
        newRegressions.push({
          name: suiteName,
          featurePassRate: featureResult.passRate,
          masterPassRate: masterResult.passRate
        });
      }
      // Pre-existing: fails on both feature AND master
      else if ((featureResult.alwaysFails || featureResult.failed > 0) && (masterResult.alwaysFails || masterResult.failed > 0)) {
        preExistingFailures.push({
          name: suiteName,
          branches: branchResults
        });
      }
      // Flaky on feature but stable on master
      else if (featureResult.isFlaky && !masterResult.isFlaky) {
        branchSpecificFailures.push({
          name: suiteName,
          featurePassRate: featureResult.passRate,
          masterPassRate: masterResult.passRate
        });
      }
      // Stable everywhere
      else if (featureResult.alwaysPasses && masterResult.alwaysPasses) {
        stableTests.push({ name: suiteName });
      }
    });

    // Display results
    console.log('## Analysis Results:\n');

    if (trulyFlaky.length > 0) {
      console.log(`### 🎲 Truly Flaky Tests (${trulyFlaky.length}):\n`);
      console.log('These tests fail intermittently on ALL branches - likely environmental/timing issues:\n');
      trulyFlaky.forEach((test) => {
        console.log(`   ${test.name.replace('testSuite', '')}`);
        Object.keys(test.branches).forEach((branch) => {
          const branchShort = branch.replace('refs/heads/', '');
          console.log(`      ${branchShort}: ${test.branches[branch].passRate}% pass rate`);
        });
        console.log('   ⚠️  Can likely ignore - not related to your code changes\n');
      });
    }

    if (newRegressions.length > 0) {
      console.log(`### 🆕 New Regressions (${newRegressions.length}):\n`);
      console.log('These tests fail on your branch but pass on master - INVESTIGATE YOUR CHANGES:\n');
      newRegressions.forEach((test) => {
        console.log(`   ${test.name.replace('testSuite', '')}`);
        console.log(`      Feature branch: ${test.featurePassRate}% pass rate`);
        console.log(`      Master: ${test.masterPassRate}% pass rate`);
        console.log('   🔍 Your code changes likely caused this\n');
      });
    }

    if (branchSpecificFailures.length > 0) {
      console.log(`### ⚠️  Branch-Specific Flakiness (${branchSpecificFailures.length}):\n`);
      console.log('These tests are flaky on your branch but stable on master:\n');
      branchSpecificFailures.forEach((test) => {
        console.log(`   ${test.name.replace('testSuite', '')}`);
        console.log(`      Feature branch: ${test.featurePassRate}% pass rate (flaky)`);
        console.log(`      Master: ${test.masterPassRate}% pass rate (stable)`);
        console.log('   🤔 Could be your changes affecting test stability\n');
      });
    }

    if (preExistingFailures.length > 0) {
      console.log(`### 📋 Pre-Existing Failures (${preExistingFailures.length}):\n`);
      console.log('These tests fail on BOTH your branch and master - not your problem:\n');
      preExistingFailures.forEach((test) => {
        console.log(`   ${test.name.replace('testSuite', '')}`);
        Object.keys(test.branches).forEach((branch) => {
          const branchShort = branch.replace('refs/heads/', '');
          console.log(`      ${branchShort}: ${test.branches[branch].passRate}% pass rate`);
        });
        console.log('   ✅ Safe to ignore - already broken\n');
      });
    }

    if (stableTests.length > 0) {
      console.log(`### ✅ Stable Tests (${stableTests.length}):\n`);
      const names = stableTests.map(t => t.name.replace('testSuite', '')).join(', ');
      console.log(`   ${names}\n`);
    }

    // Summary
    console.log('\n## Summary:\n');
    console.log(`   Total test suites: ${allSuites.size}`);
    console.log(`   Truly flaky (all branches): ${trulyFlaky.length}`);
    console.log(`   New regressions (your changes): ${newRegressions.length}`);
    console.log(`   Branch-specific flakiness: ${branchSpecificFailures.length}`);
    console.log(`   Pre-existing failures: ${preExistingFailures.length}`);
    console.log(`   Stable tests: ${stableTests.length}`);
    console.log('');

    console.log('## Recommendations:\n');
    if (newRegressions.length > 0) {
      console.log('🔴 PRIORITY: Investigate new regressions - these are likely caused by your code changes');
    }
    if (branchSpecificFailures.length > 0) {
      console.log('🟡 CONSIDER: Branch-specific flakiness might be caused by your changes');
    }
    if (trulyFlaky.length > 0) {
      console.log('⚪ IGNORE: Truly flaky tests are environmental issues, not related to your code');
    }
    if (preExistingFailures.length > 0) {
      console.log('⚪ IGNORE: Pre-existing failures were already broken before your changes');
    }

  } catch (error) {
    console.error('Error analyzing test flakiness:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
});
