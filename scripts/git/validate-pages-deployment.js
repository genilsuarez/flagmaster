#!/usr/bin/env node

/**
 * GitHub Pages Deployment Validator
 * Usage: node scripts/git/validate-pages-deployment.js
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  colors, log, logHeader, logSuccess, logError, logWarning, logInfo
} from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const REPO_OWNER = 'genilsuarez';
const REPO_NAME  = 'flagmaster';
const PAGES_URL  = `https://${REPO_OWNER}.github.io/${REPO_NAME}/`;

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', cwd: rootDir }).trim();
}

function getCurrentCommit() {
  try { return run('git rev-parse HEAD'); } catch { return null; }
}

function getCurrentBranch() {
  try { return run('git branch --show-current'); } catch { return null; }
}

async function fetchPagesInfo() {
  try {
    const out = run(`gh api repos/${REPO_OWNER}/${REPO_NAME}/pages`);
    return JSON.parse(out);
  } catch (err) {
    if (err.message.includes('404')) logWarning('GitHub Pages not configured for this repo');
    else logWarning(`Pages API not available: ${err.message}`);
    return null;
  }
}

async function fetchLatestDeployment() {
  try {
    const envs = ['production', 'github-pages'];
    let latest = null;
    let latestStatus = null;

    const results = await Promise.all(envs.map(env => {
      try {
        const out = run(
          `gh api repos/${REPO_OWNER}/${REPO_NAME}/deployments --jq '[.[] | select(.environment == "${env}")] | .[0]'`
        );
        return out && out !== 'null' ? JSON.parse(out) : null;
      } catch { return null; }
    }));

    for (const d of results) {
      if (d && (!latest || new Date(d.created_at) > new Date(latest.created_at))) {
        latest = d;
      }
    }

    if (!latest) return null;

    try {
      const statusOut = run(
        `gh api repos/${REPO_OWNER}/${REPO_NAME}/deployments/${latest.id}/statuses --jq '.[0]'`
      );
      latestStatus = statusOut && statusOut !== 'null' ? JSON.parse(statusOut) : null;
    } catch { /* ignore */ }

    return { deployment: latest, status: latestStatus };
  } catch (err) {
    logError(`Failed to fetch deployment: ${err.message}`);
    return null;
  }
}

async function checkActiveWorkflows() {
  try {
    const out = run(
      `gh run list --limit 10 --json status,name --jq '[.[] | select(.status == "in_progress" or .status == "queued")]'`
    );
    return out ? JSON.parse(out) : [];
  } catch {
    return [];
  }
}

async function testSiteAccessibility() {
  try {
    logInfo(`Testing: ${PAGES_URL}`);
    const out = run(
      `curl -s -o /dev/null -w "%{http_code}|%{time_total}|%{size_download}" --max-time 10 "${PAGES_URL}"`
    );
    const [httpCode, timeTotal, sizeDownload] = out.split('|');
    return {
      accessible: httpCode === '200',
      httpCode,
      responseTime: Math.round(parseFloat(timeTotal) * 1000),
      size: Math.round(parseInt(sizeDownload) / 1024)
    };
  } catch {
    return { accessible: false, httpCode: 'ERROR', responseTime: null, size: null };
  }
}

function formatTimestamp(ts) {
  if (!ts) return 'Unknown';
  const date = new Date(ts);
  const diffMs = Date.now() - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const ago = diffDays > 0 ? `${diffDays}d ago` :
              diffHours > 0 ? `${diffHours}h ago` :
              diffMins > 0 ? `${diffMins}m ago` : 'just now';
  return `${date.toLocaleString()} (${ago})`;
}

async function validateDeployment() {
  logHeader('🚀 Deployment Status');

  const commit = getCurrentCommit();
  const branch = getCurrentBranch();
  if (commit && branch) logInfo(`📍 ${branch}@${commit.substring(0, 8)}`);

  const [pagesInfo, deploymentInfo, activeWorkflows, accessibility] = await Promise.all([
    fetchPagesInfo(),
    fetchLatestDeployment(),
    checkActiveWorkflows(),
    testSiteAccessibility(),
  ]);

  if (pagesInfo) {
    if (pagesInfo.build_type === 'workflow') {
      logSuccess('✨ GitHub Actions deployment (Modern)');
    } else if (pagesInfo.source?.branch) {
      logInfo(`📋 Source: ${pagesInfo.source.branch} (Legacy)`);
    }
  }

  if (deploymentInfo) {
    const { deployment, status } = deploymentInfo;
    const sha = deployment.sha?.substring(0, 8) || '?';
    const time = formatTimestamp(deployment.created_at);
    const stateColor = status?.state === 'success' ? colors.green :
                       status?.state === 'failure' ? colors.red : colors.yellow;
    log(`\n📦 Deployment: ${status?.state || 'unknown'} | ${sha} | ${time}`, stateColor);

    if (commit && deployment.sha) {
      const isCurrent = commit.startsWith(deployment.sha) || deployment.sha.startsWith(commit);
      if (isCurrent) logSuccess('✅ Current commit is deployed');
      else logWarning(`⚠️  Local: ${commit.substring(0, 8)} | Deployed: ${deployment.sha.substring(0, 8)}`);
    }
  }

  if (activeWorkflows.length > 0) {
    logInfo(`⚡ Active: ${activeWorkflows.map(w => w.name).join(', ')}`);
  }

  if (accessibility.accessible) {
    const perf = accessibility.responseTime ? ` | ${accessibility.responseTime}ms` : '';
    const size = accessibility.size ? ` | ${accessibility.size}KB` : '';
    logSuccess(`🌐 Site accessible (HTTP ${accessibility.httpCode}${perf}${size})`);
  } else {
    logError(`🌐 Site not accessible (HTTP ${accessibility.httpCode})`);
  }

  let status = 'UNKNOWN';
  if (accessibility.accessible) {
    if (deploymentInfo?.status?.state === 'success') status = 'HEALTHY';
    else if (deploymentInfo?.status?.state === 'pending' || activeWorkflows.length > 0) status = 'DEPLOYING';
    else if (deploymentInfo?.status?.state === 'failure') status = 'FAILED';
    else status = 'ACCESSIBLE';
  } else {
    status = activeWorkflows.length > 0 ? 'DEPLOYING' : 'INACCESSIBLE';
  }

  const statusColor = ['HEALTHY', 'ACCESSIBLE'].includes(status) ? colors.green :
                      status === 'DEPLOYING' ? colors.yellow : colors.red;

  console.log('\n' + '='.repeat(40));
  log(`📊 Status: ${status}`, colors.bright + statusColor);
  logInfo(`🌐 ${PAGES_URL}`);
  if (deploymentInfo?.deployment) {
    const ago = formatTimestamp(deploymentInfo.deployment.created_at).split('(')[1]?.replace(')', '') || 'recently';
    logInfo(`⏰ Last deploy: ${ago}`);
  }
  if (accessibility.accessible && accessibility.responseTime) {
    const perf = accessibility.responseTime < 200 ? '⚡ Fast' :
                 accessibility.responseTime < 500 ? '🟡 Good' : '🔴 Slow';
    logInfo(`${perf} response: ${accessibility.responseTime}ms`);
  }
  console.log('='.repeat(40));

  return ['HEALTHY', 'ACCESSIBLE', 'DEPLOYING'].includes(status);
}

validateDeployment()
  .then(ok => process.exit(ok ? 0 : 1))
  .catch(err => { logError(err.message); process.exit(1); });
