#!/usr/bin/env node

/**
 * Parse and format Azure DevOps test run results
 *
 * Usage: az rest --url ... | node parse_test_results.js
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
    const data = JSON.parse(inputData);
    const testRuns = data.value || [];

    if (testRuns.length === 0) {
      console.log('No test runs found.');
      return;
    }

    console.log('\n=== Azure DevOps Test Results ===\n');

    // Calculate overall statistics
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalNotApplicable = 0;
    let totalIncomplete = 0;
    let totalUnanalyzed = 0;

    testRuns.forEach((run) => {
      totalTests += run.totalTests || 0;
      totalPassed += run.passedTests || 0;
      totalNotApplicable += run.notApplicableTests || 0;
      totalIncomplete += run.incompleteTests || 0;
      totalUnanalyzed += run.unanalyzedTests || 0;

      // Failed = total - passed - notApplicable - incomplete
      const failed = (run.totalTests || 0) - (run.passedTests || 0) - (run.notApplicableTests || 0) - (run.incompleteTests || 0);
      totalFailed += failed;
    });

    // Overall summary
    const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
    const overallStatus = totalFailed === 0 && totalIncomplete === 0 ? '✅' : '⚠️';

    console.log(`${overallStatus} Overall Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed} (${passRate}%)`);
    if (totalFailed > 0) console.log(`   Failed: ${totalFailed}`);
    if (totalUnanalyzed > 0) console.log(`   Unanalyzed: ${totalUnanalyzed}`);
    if (totalIncomplete > 0) console.log(`   Incomplete: ${totalIncomplete}`);
    if (totalNotApplicable > 0) console.log(`   Not Applicable: ${totalNotApplicable}`);
    console.log('');

    // Group test suites by status
    const failedSuites = [];
    const unanalyzedSuites = [];
    const passedSuites = [];

    testRuns.forEach((run) => {
      const failed = (run.totalTests || 0) - (run.passedTests || 0) - (run.notApplicableTests || 0) - (run.incompleteTests || 0);
      const suiteName = run.name.replace('testSuite', '');

      const suiteInfo = {
        name: suiteName,
        total: run.totalTests || 0,
        passed: run.passedTests || 0,
        failed: failed,
        unanalyzed: run.unanalyzedTests || 0,
        notApplicable: run.notApplicableTests || 0,
        incomplete: run.incompleteTests || 0,
        url: run.webAccessUrl
      };

      if (failed > 0 || run.incompleteTests > 0) {
        failedSuites.push(suiteInfo);
      } else if (run.unanalyzedTests > 0) {
        unanalyzedSuites.push(suiteInfo);
      } else {
        passedSuites.push(suiteInfo);
      }
    });

    // Display failed/problematic suites first
    if (failedSuites.length > 0) {
      console.log('❌ Suites with Failures:');
      failedSuites.forEach((suite) => {
        console.log(`   ${suite.name}: ${suite.passed}/${suite.total} passed, ${suite.failed} failed`);
        if (suite.unanalyzed > 0) console.log(`      (${suite.unanalyzed} unanalyzed)`);
        console.log(`      ${suite.url}`);
      });
      console.log('');
    }

    // Display suites with unanalyzed tests
    if (unanalyzedSuites.length > 0) {
      console.log('⚠️  Suites with Unanalyzed Tests:');
      unanalyzedSuites.forEach((suite) => {
        console.log(`   ${suite.name}: ${suite.passed}/${suite.total} passed, ${suite.unanalyzed} unanalyzed`);
      });
      console.log('');
    }

    // Display passed suites summary
    if (passedSuites.length > 0) {
      console.log(`✅ ${passedSuites.length} Suite${passedSuites.length > 1 ? 's' : ''} Passed:`);
      const suiteNames = passedSuites.map(s => s.name).join(', ');
      console.log(`   ${suiteNames}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error parsing test results:', error.message);
    process.exit(1);
  }
});
