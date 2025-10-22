#!/usr/bin/env node

/**
 * Parse and format Azure DevOps build output
 *
 * Usage: az pipelines build list ... | node parse_build_status.js
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
    const builds = JSON.parse(inputData);

    if (!Array.isArray(builds) || builds.length === 0) {
      console.log('No builds found.');
      return;
    }

    console.log('\n=== Azure DevOps Build Status ===\n');

    builds.forEach((build, index) => {
      const statusEmoji = getStatusEmoji(build.status, build.result);
      const duration = calculateDuration(build.startTime, build.finishTime);

      console.log(`${index + 1}. ${statusEmoji} Build #${build.buildNumber} (ID: ${build.id})`);
      console.log(`   Status: ${build.status}${build.result ? ` - ${build.result}` : ''}`);
      console.log(`   Branch: ${build.sourceBranch.replace('refs/heads/', '')}`);
      console.log(`   Started: ${formatDate(build.startTime)}`);

      if (build.finishTime) {
        console.log(`   Finished: ${formatDate(build.finishTime)} (${duration})`);
      } else if (build.status === 'inProgress') {
        console.log(`   Running for: ${duration}`);
      }

      console.log(`   Requested by: ${build.requestedFor.displayName}`);

      if (build.sourceVersion) {
        console.log(`   Commit: ${build.sourceVersion.substring(0, 8)}`);
      }

      console.log('');
    });

  } catch (error) {
    console.error('Error parsing build data:', error.message);
    process.exit(1);
  }
});

function getStatusEmoji(status, result) {
  if (status === 'completed') {
    if (result === 'succeeded') return '✅';
    if (result === 'failed') return '❌';
    if (result === 'canceled') return '⚠️';
    if (result === 'partiallySucceeded') return '⚠️';
  }
  if (status === 'inProgress') return '🔄';
  if (status === 'notStarted') return '⏳';
  return '❓';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateDuration(startTime, finishTime) {
  const start = new Date(startTime);
  const end = finishTime ? new Date(finishTime) : new Date();
  const diffMs = end - start;

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}
