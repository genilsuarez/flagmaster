#!/usr/bin/env node

/**
 * GitHub Actions Status Checker
 * Usage: node scripts/git/github-actions-status.js [status|current|watch|watch-all|logs]
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  colors, log, logHeader, logSuccess, logError, logWarning, logInfo, logDivider
} from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const command = process.argv[2] || 'status';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', cwd: rootDir }).trim();
}

function checkGHCLI() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    execSync('gh auth status', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getCurrentCommitSha() {
  try {
    return run('git rev-parse HEAD');
  } catch {
    return null;
  }
}

function getWorkflowRuns(limit = 10) {
  try {
    const out = run(
      `gh run list --limit ${limit} --json status,conclusion,workflowName,createdAt,headBranch,headSha,url,displayTitle,event,updatedAt,databaseId`
    );
    return JSON.parse(out);
  } catch {
    logError('Failed to fetch workflow runs');
    return [];
  }
}

function getFailedJobLogs(runId) {
  try {
    const out = execSync(`gh run view ${runId} --log-failed`, {
      encoding: 'utf8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 5 * 1024 * 1024
    });
    return out;
  } catch (err) {
    return err.stdout || err.stderr || '';
  }
}

function extractErrorSummary(logs) {
  if (!logs) return [];
  const lines = logs.split('\n');
  const errorLines = [];
  const patterns = [
    /\b(error|Error|ERROR)\b/,
    /\b(fail(ed|ure)?|FAIL(ED|URE)?)\b/,
    /\b(fatal|FATAL)\b/,
    /npm error/i,
    /##\[error\]/,
    /exit code [1-9]/i,
  ];

  for (const line of lines) {
    const trimmed = line.replace(/^\S+\s+\S+\s+\S+\s+/, '').trim(); // strip gh log prefix
    if (patterns.some(p => p.test(trimmed)) && trimmed.length > 5) {
      // Avoid duplicates and noise
      if (!errorLines.includes(trimmed) && !trimmed.startsWith('npm error aliases')) {
        errorLines.push(trimmed);
      }
    }
  }
  return errorLines.slice(0, 15); // cap at 15 most relevant lines
}

function printRuns(runs) {
  if (runs.length === 0) {
    logInfo('No workflow runs found');
    return;
  }
  runs.forEach(r => {
    const icon = r.conclusion === 'success' ? '✅' :
                 r.conclusion === 'failure' ? '❌' :
                 r.status === 'in_progress' ? '🔄' :
                 r.status === 'queued' ? '⏳' : '⏳';
    const sha = r.headSha?.substring(0, 8) || '?';
    const elapsed = getElapsed(r.createdAt, r.updatedAt);
    log(`${icon} [${r.workflowName}] ${r.displayTitle} (${sha}) — ${r.conclusion || r.status}${elapsed}`, colors.white);
  });
}

function getElapsed(created, updated) {
  if (!created) return '';
  const end = updated ? new Date(updated) : new Date();
  const start = new Date(created);
  const secs = Math.round((end - start) / 1000);
  if (secs < 60) return ` (${secs}s)`;
  return ` (${Math.floor(secs / 60)}m ${secs % 60}s)`;
}

function printFailureDiagnostics(failedRuns) {
  for (const r of failedRuns) {
    console.log('');
    logDivider('─', 60);
    logError(`${r.workflowName} — "${r.displayTitle}"`);
    logInfo(`URL: ${r.url}`);
    logInfo('Fetching error logs...');

    const logs = getFailedJobLogs(r.databaseId);
    const errors = extractErrorSummary(logs);

    if (errors.length > 0) {
      log('\n  📋 Error summary:', colors.yellow);
      errors.forEach(e => log(`     ${e}`, colors.red));
    } else {
      logWarning('Could not extract error details. Check the URL above.');
    }
    logDivider('─', 60);
  }
}

async function watchAll() {
  const commitSha = getCurrentCommitSha();
  const shortSha = commitSha?.substring(0, 8) || '?';

  logHeader(`👀 Monitoring CI/CD for commit ${shortSha}`);
  logInfo('Polling every 8s — Ctrl+C to stop\n');

  const maxWait = 600; // 10 min
  const pollInterval = 8;
  let elapsed = 0;
  let lastStatus = '';

  while (elapsed < maxWait) {
    const allRuns = getWorkflowRuns(10);

    // Filter runs for the current commit
    const currentRuns = commitSha
      ? allRuns.filter(r => r.headSha === commitSha)
      : allRuns.slice(0, 4);

    if (currentRuns.length === 0 && elapsed < 30) {
      // Workflows may not have started yet
      process.stdout.write(`\r⏳ Waiting for workflows to start... (${elapsed}s)`);
      await new Promise(r => setTimeout(r, pollInterval * 1000));
      elapsed += pollInterval;
      continue;
    }

    const active = currentRuns.filter(r => r.status === 'in_progress' || r.status === 'queued');
    const failed = currentRuns.filter(r => r.conclusion === 'failure');
    const succeeded = currentRuns.filter(r => r.conclusion === 'success');

    // Build a compact status line
    const statusLine = currentRuns.map(r => {
      const icon = r.conclusion === 'success' ? '✅' :
                   r.conclusion === 'failure' ? '❌' :
                   r.status === 'in_progress' ? '🔄' : '⏳';
      return `${icon} ${r.workflowName}`;
    }).join('  │  ');

    // Only reprint if status changed
    if (statusLine !== lastStatus) {
      console.log(`\n  [${elapsed}s] ${statusLine}`);
      lastStatus = statusLine;
    } else {
      process.stdout.write(`\r  ⏱️  ${elapsed}s elapsed...`);
    }

    // All done?
    if (active.length === 0) {
      console.log('\n');
      logDivider('═', 60);

      if (failed.length === 0) {
        logSuccess(`All ${succeeded.length} workflow(s) passed ✨`);
        currentRuns.forEach(r => {
          logSuccess(`${r.workflowName} — ${getElapsed(r.createdAt, r.updatedAt).trim()}`);
        });
        logDivider('═', 60);
        process.exit(0);
      } else {
        logError(`${failed.length} workflow(s) failed, ${succeeded.length} passed`);
        printFailureDiagnostics(failed);
        console.log('');
        logDivider('═', 60);
        logError('Deploy incomplete — fix the errors above and re-run');
        logInfo(`Tip: run \`gh run view ${failed[0].databaseId} --log-failed\` for full logs`);
        logDivider('═', 60);
        process.exit(1);
      }
    }

    await new Promise(r => setTimeout(r, pollInterval * 1000));
    elapsed += pollInterval;
  }

  logWarning('Timeout (10min) waiting for workflows to complete');
  logInfo('Check manually: gh run list');
  process.exit(1);
}

async function main() {
  if (!checkGHCLI()) {
    logError('GitHub CLI not available or not authenticated');
    logInfo('Install: https://cli.github.com/');
    process.exit(1);
  }

  switch (command) {
    case 'status':
    case 'current': {
      logHeader('📊 GitHub Actions Status');
      const runs = getWorkflowRuns(10);
      printRuns(runs);
      break;
    }
    case 'watch':
    case 'watch-all':
      await watchAll();
      break;
    case 'logs': {
      const runs = getWorkflowRuns(5);
      const failed = runs.filter(r => r.conclusion === 'failure');
      if (failed.length > 0) {
        printFailureDiagnostics(failed.slice(0, 3));
      } else {
        logSuccess('No recent failures');
        printRuns(runs.slice(0, 5));
      }
      break;
    }
    default:
      logWarning(`Unknown command: ${command}`);
      logInfo('Usage: node scripts/git/github-actions-status.js [status|current|watch|watch-all|logs]');
  }
}

main().catch(err => {
  logError(err.message);
  process.exit(1);
});
