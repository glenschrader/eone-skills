#!/usr/bin/env node

/**
 * Analyze failed test results from Azure DevOps
 *
 * Usage: az rest --url ".../_apis/test/runs/<RUN_ID>/results?outcomes=Failed..." | node analyze_failed_tests.js
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
    const failedTests = data.value || [];

    if (failedTests.length === 0) {
      console.log('No failed tests found.');
      return;
    }

    console.log('\n=== Failed Test Analysis ===\n');
    console.log(`Total Failed Tests: ${failedTests.length}\n`);

    // Group tests by error patterns
    const errorPatterns = {};
    const classesInvolved = new Set();
    const newFailures = [];
    const existingFailures = [];

    failedTests.forEach((test) => {
      // Extract test info
      const testClass = test.automatedTestStorage || 'Unknown';
      const testMethod = test.automatedTestName || 'Unknown';
      const errorMsg = test.errorMessage || 'No error message';
      const stackTrace = test.stackTrace || '';

      // Categorize by error type
      let errorType = 'Unknown';
      if (errorMsg.includes('NullPointerException')) {
        errorType = 'NullPointerException';
      } else if (errorMsg.includes('IllegalStateException')) {
        errorType = 'IllegalStateException';
      } else if (errorMsg.includes('AssertionError') || errorMsg.includes('expected')) {
        errorType = 'Assertion Failure';
      } else if (errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
        errorType = 'Timeout';
      } else if (errorMsg.includes('SQLException') || errorMsg.includes('database')) {
        errorType = 'Database Issue';
      } else if (errorMsg.includes('showing on the screen')) {
        errorType = 'UI Component Not Visible';
      } else {
        errorType = 'Other Error';
      }

      if (!errorPatterns[errorType]) {
        errorPatterns[errorType] = [];
      }

      errorPatterns[errorType].push({
        testClass,
        testMethod,
        errorMsg: errorMsg.substring(0, 200), // Truncate long errors
        stackTrace
      });

      // Track classes involved
      classesInvolved.add(testClass);

      // Extract classes from stack trace
      const stackLines = stackTrace.split('\n');
      stackLines.forEach((line) => {
        const match = line.match(/at\s+([\w.]+)/);
        if (match && match[1].includes('com.entero')) {
          const className = match[1].substring(0, match[1].lastIndexOf('.'));
          classesInvolved.add(className);
        }
      });

      // Check if this is a new failure
      if (test.failingSince && test.failingSince.build) {
        const failingSinceBuild = test.failingSince.build.number;
        const currentBuild = test.build ? test.build.name : '';

        if (failingSinceBuild === currentBuild) {
          newFailures.push({ testClass, testMethod, errorType });
        } else {
          existingFailures.push({ testClass, testMethod, errorType, failingSinceBuild });
        }
      }
    });

    // Display results grouped by error pattern
    console.log('## Failures by Error Type:\n');
    Object.keys(errorPatterns).sort((a, b) => errorPatterns[b].length - errorPatterns[a].length).forEach((errorType) => {
      const tests = errorPatterns[errorType];
      console.log(`### ${errorType} (${tests.length} test${tests.length > 1 ? 's' : ''})`);

      tests.slice(0, 5).forEach((test) => {
        console.log(`   - ${test.testClass}.${test.testMethod}`);
        console.log(`     Error: ${test.errorMsg.replace(/\n/g, ' ')}`);
      });

      if (tests.length > 5) {
        console.log(`   ... and ${tests.length - 5} more`);
      }
      console.log('');
    });

    // Display new vs existing failures
    if (newFailures.length > 0) {
      console.log(`## 🆕 New Failures (${newFailures.length}):\n`);
      console.log('These tests started failing in THIS build:\n');
      newFailures.slice(0, 10).forEach((test) => {
        console.log(`   - ${test.testClass}.${test.testMethod}`);
        console.log(`     Type: ${test.errorType}`);
      });
      if (newFailures.length > 10) {
        console.log(`   ... and ${newFailures.length - 10} more`);
      }
      console.log('');
    }

    if (existingFailures.length > 0) {
      console.log(`## ⚠️  Existing Failures (${existingFailures.length}):\n`);
      console.log('These tests were already failing in previous builds:\n');
      existingFailures.slice(0, 5).forEach((test) => {
        console.log(`   - ${test.testClass}.${test.testMethod}`);
        console.log(`     Failing since: ${test.failingSinceBuild}`);
      });
      if (existingFailures.length > 5) {
        console.log(`   ... and ${existingFailures.length - 5} more`);
      }
      console.log('');
    }

    // Display classes involved
    console.log(`## Classes Involved in Failures (${classesInvolved.size}):\n`);
    console.log('Check these classes for recent changes:\n');
    const sortedClasses = Array.from(classesInvolved).sort();
    sortedClasses.slice(0, 15).forEach((className) => {
      // Convert package path to file path
      const filePath = className.replace(/\./g, '/') + '.java';
      console.log(`   - ${className}`);
      console.log(`     File: modules/*/src/**/java/${filePath}`);
    });
    if (sortedClasses.length > 15) {
      console.log(`   ... and ${sortedClasses.length - 15} more`);
    }
    console.log('');

    console.log('## Suggested Next Steps:\n');
    if (newFailures.length > 0) {
      console.log('1. Focus on NEW failures first - these are most likely related to recent code changes');
      console.log('2. Use `git diff master` to see what changed in the involved classes');
      console.log('3. Check recent commits on this branch for changes to the classes listed above');
    } else {
      console.log('1. All failures are existing - these were already failing in previous builds');
      console.log('2. Consider investigating the most common error patterns first');
    }
    console.log('');

  } catch (error) {
    console.error('Error parsing failed test data:', error.message);
    process.exit(1);
  }
});
