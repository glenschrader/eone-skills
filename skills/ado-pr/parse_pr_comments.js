#!/usr/bin/env node
/**
 * Parse and display Azure DevOps PR comments in a readable format
 * Usage: node parse_pr_comments.js [filename]
 * Default filename: pr_comments.json
 */

const fs = require('fs');

// Get filename from command line or use default
const filename = process.argv[2] || 'pr_comments.json';

// Check if file exists
if (!fs.existsSync(filename)) {
  console.error(`Error: File '${filename}' not found`);
  console.error('Usage: node parse_pr_comments.js [filename]');
  process.exit(1);
}

// Parse the JSON file
let data;
try {
  data = JSON.parse(fs.readFileSync(filename, 'utf8'));
} catch (error) {
  console.error(`Error parsing JSON file: ${error.message}`);
  process.exit(1);
}

const threads = data.value || [];

// Display summary
console.log('='.repeat(70));
console.log('PR Comment Threads Summary');
console.log('='.repeat(70));
console.log('');
console.log(`Total threads: ${threads.length}`);
const active = threads.filter(t => t.status === 'active').length;
const resolved = threads.filter(t => t.status === 'fixed').length;
const closed = threads.filter(t => t.status === 'closed').length;
const unknown = threads.filter(t => !t.status || t.status === 'unknown').length;
console.log(`Active (unresolved): ${active}`);
console.log(`Resolved: ${resolved}`);
console.log(`Closed: ${closed}`);
if (unknown > 0) {
  console.log(`Unknown status: ${unknown}`);
}
console.log('');

// Display each thread
threads.forEach((thread, i) => {
  const status = thread.status || 'unknown';
  const context = thread.threadContext || {};
  const filePath = context.filePath || 'General comment';
  const line = context.rightFileStart?.line || '';

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Thread ${i + 1} [${status.toUpperCase()}]`);
  console.log(`${'='.repeat(70)}`);

  if (line) {
    console.log(`Location: ${filePath}:${line}`);
  } else {
    console.log(`Location: ${filePath}`);
  }
  console.log('');

  const comments = thread.comments || [];
  comments.forEach((comment, ci) => {
    if (comment.commentType === 'text' || comment.commentType === 'system') {
      const author = comment.author?.displayName || 'System';
      const content = comment.content || '';
      const date = (comment.publishedDate || '').substring(0, 19).replace('T', ' ');

      if (ci > 0) {
        console.log('');
      }

      console.log(`  [${author}] ${date}`);
      console.log(`  ${'-'.repeat(66)}`);

      // Handle multi-line content properly
      const lines = content.split('\n');
      lines.forEach(line => {
        console.log(`  ${line}`);
      });
    }
  });
});

console.log('');
console.log('='.repeat(70));
