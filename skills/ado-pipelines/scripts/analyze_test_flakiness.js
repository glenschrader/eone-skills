#!/usr/bin/env node

/**
 * Analyze test flakiness across multiple builds
 *
 * This script takes build IDs as arguments and analyzes test results across those builds
 * to identify flaky tests (tests that pass sometimes and fail other times).
 *
 * Usage: node analyze_test_flakiness.js <build1> <build2> <build3> ...
 *
 * The script expects to receive test run data via stdin in JSON format.
 * You should pipe the output from multiple az rest calls.
 */

const readline = require('readline');

// Get build IDs from command line arguments
const buildIds = process.argv.slice(2);

if (buildIds.length < 2) {
  console.error('Usage: node analyze_test_flakiness.js <build1> <build2> <build3> ...');
  console.error('Please provide at least 2 build IDs to compare');
  process.exit(1);
}

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
    // Input should be an array of test run responses, one per build
    const buildTestRuns = JSON.parse(inputData);

    if (!Array.isArray(buildTestRuns)) {
      console.error('Expected an array of build test run data');
      process.exit(1);
    }

    console.log('\n=== Test Flakiness Analysis ===\n');
    console.log(`Analyzing ${buildTestRuns.length} builds: ${buildIds.join(', ')}\n`);

    // Track test suites across builds
    const suiteHistory = {};

    buildTestRuns.forEach((buildData, index) => {
      const buildId = buildIds[index];
      const testRuns = buildData.value || [];

      testRuns.forEach((run) => {
        const suiteName = run.name;

        if (!suiteHistory[suiteName]) {
          suiteHistory[suiteName] = {
            total: 0,
            passed: 0,
            failed: 0,
            builds: []
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

        suiteHistory[suiteName].builds.push({
          buildId,
          passed: run.passedTests || 0,
          failed,
          total: run.totalTests || 0
        });
      });
    });

    // Categorize test suites
    const flakyTests = [];
    const consistentFailures = [];
    const consistentPasses = [];
    const newFailures = [];

    Object.keys(suiteHistory).forEach((suiteName) => {
      const history = suiteHistory[suiteName];

      if (history.passed > 0 && history.failed > 0) {
        // Flaky: passes sometimes, fails sometimes
        flakyTests.push({
          name: suiteName,
          passRate: ((history.passed / history.total) * 100).toFixed(1),
          history: history.builds
        });
      } else if (history.failed === history.total) {
        // Consistent failure
        consistentFailures.push({
          name: suiteName,
          history: history.builds
        });
      } else if (history.passed === history.total) {
        // Consistent pass
        consistentPasses.push({
          name: suiteName
        });
      }

      // Check if it failed in the most recent build but passed before
      if (history.builds.length > 1) {
        const mostRecent = history.builds[history.builds.length - 1];
        const previousBuilds = history.builds.slice(0, -1);

        if (mostRecent.failed > 0 && previousBuilds.every(b => b.failed === 0)) {
          newFailures.push({
            name: suiteName,
            failedTests: mostRecent.failed,
            totalTests: mostRecent.total
          });
        }
      }
    });

    // Display results
    if (flakyTests.length > 0) {
      console.log(`## 🎲 Flaky Tests (${flakyTests.length}):\n`);
      console.log('These test suites have inconsistent results across builds:\n');

      flakyTests.sort((a, b) => parseFloat(a.passRate) - parseFloat(b.passRate)).forEach((test) => {
        console.log(`   ${test.name.replace('testSuite', '')} - Pass Rate: ${test.passRate}%`);
        console.log(`   Build History:`);
        test.history.forEach((build) => {
          const status = build.failed > 0 ? `❌ ${build.failed} failed` : `✅ passed`;
          console.log(`      Build ${build.buildId}: ${status} (${build.passed}/${build.total})`);
        });
        console.log('');
      });
    }

    if (newFailures.length > 0) {
      console.log(`## 🆕 New Failures (${newFailures.length}):\n`);
      console.log('These test suites started failing in the most recent build:\n');

      newFailures.forEach((test) => {
        console.log(`   ${test.name.replace('testSuite', '')} - ${test.failedTests} failed out of ${test.totalTests}`);
      });
      console.log('');
    }

    if (consistentFailures.length > 0) {
      console.log(`## ❌ Consistent Failures (${consistentFailures.length}):\n`);
      console.log('These test suites fail in ALL builds analyzed:\n');

      consistentFailures.forEach((test) => {
        console.log(`   ${test.name.replace('testSuite', '')}`);
      });
      console.log('');
    }

    if (consistentPasses.length > 0) {
      console.log(`## ✅ Stable Tests (${consistentPasses.length}):\n`);
      console.log('These test suites consistently pass:\n');
      const names = consistentPasses.map(t => t.name.replace('testSuite', '')).join(', ');
      console.log(`   ${names}`);
      console.log('');
    }

    // Summary
    console.log('## Summary:\n');
    console.log(`   Total test suites analyzed: ${Object.keys(suiteHistory).length}`);
    console.log(`   Flaky tests: ${flakyTests.length}`);
    console.log(`   New failures: ${newFailures.length}`);
    console.log(`   Consistent failures: ${consistentFailures.length}`);
    console.log(`   Stable tests: ${consistentPasses.length}`);
    console.log('');

    if (flakyTests.length > 0) {
      console.log('⚠️  Focus on flaky tests - these may not be related to code changes');
    }
    if (newFailures.length > 0) {
      console.log('🔍 Investigate new failures - these are likely caused by recent code changes');
    }

  } catch (error) {
    console.error('Error analyzing test flakiness:', error.message);
    process.exit(1);
  }
});
