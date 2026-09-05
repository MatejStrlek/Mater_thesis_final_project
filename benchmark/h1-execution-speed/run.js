#!/usr/bin/env node
/**
 * H1 — Execution Speed Advantage
 * "Playwright executes an equivalent-scope E2E suite faster than
 * Selenium WebDriver."
 *
 * Runs both sibling suites (this repo's Playwright suite, scoped to the
 * 12-file comparable subset, and ../Selenium-masters-thesis-code's full
 * 42-test suite) against the same target app container, restarting the
 * container and waiting for readiness before every single run so no run
 * starts with state left over from the previous one (the app's own
 * documented quirk: mutating state persists until restart). Round order
 * alternates (playwright-first / selenium-first) across rounds to cancel
 * out machine warm-up/thermal drift as a confound, rather than running
 * all of one suite then all of the other.
 *
 * Usage:
 *   node benchmark/h1-execution-speed/run.js [rounds]   # default 10 rounds = 20 runs
 *
 * Output: results.jsonl (one JSON record per run, appended as it
 * happens, so a killed/crashed harness still leaves partial data),
 * run-logs/<timestamp>-<framework>.log (full stdout/stderr per run, for
 * diagnosing any non-zero exit), and a mean/median/stdev summary printed
 * at the end (also written to summary.json).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { restartContainer, waitReady, BASE_URL } = require('../lib/container');
const { PLAYWRIGHT_TEST_ARGS } = require('../lib/comparable-specs');

const HERE = __dirname;
const PLAYWRIGHT_DIR = path.resolve(HERE, '..', '..');
const SELENIUM_DIR = path.resolve(HERE, '..', '..', '..', 'Selenium-masters-thesis-code');
const RESULTS_FILE = path.join(HERE, 'results.jsonl');
const LOG_DIR = path.join(HERE, 'run-logs');

const N_ROUNDS = parseInt(process.argv[2] || '10', 10);

function runSuite(framework, runId) {
  const dir = framework === 'playwright' ? PLAYWRIGHT_DIR : SELENIUM_DIR;
  const cmd = framework === 'playwright' ? `npx playwright test ${PLAYWRIGHT_TEST_ARGS.join(' ')}` : 'npm test';
  const env = { ...process.env, CI: 'true', HEADLESS: 'true', BASE_URL };
  const start = Date.now();
  const result = spawnSync(cmd, { cwd: dir, shell: true, env, encoding: 'utf-8' });
  const durationMs = Date.now() - start;

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, `${runId}-${framework}.log`);
  fs.writeFileSync(logFile, `--- stdout ---\n${result.stdout || ''}\n--- stderr ---\n${result.stderr || ''}`);

  return {
    framework,
    durationMs,
    exitCode: result.status,
    timestamp: new Date().toISOString(),
    logFile: path.relative(HERE, logFile),
  };
}

function appendResult(record) {
  fs.appendFileSync(RESULTS_FILE, JSON.stringify(record) + '\n');
}

async function runOne(framework) {
  console.log(`\n[${new Date().toISOString()}] restarting container before ${framework} run...`);
  restartContainer();
  await waitReady();
  console.log(`[${new Date().toISOString()}] running ${framework} suite...`);
  const runId = Date.now();
  const record = runSuite(framework, runId);
  console.log(`[${new Date().toISOString()}] ${framework}: ${record.durationMs}ms, exit ${record.exitCode}`);
  appendResult(record);
  return record;
}

async function main() {
  console.log(`Running ${N_ROUNDS} rounds (${N_ROUNDS * 2} total runs), alternating order.`);
  for (let i = 0; i < N_ROUNDS; i++) {
    const order = i % 2 === 0 ? ['playwright', 'selenium'] : ['selenium', 'playwright'];
    for (const framework of order) {
      await runOne(framework);
    }
  }
  summarize();
}

function summarize() {
  if (!fs.existsSync(RESULTS_FILE)) {
    console.log('No results file found.');
    return;
  }
  const lines = fs
    .readFileSync(RESULTS_FILE, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const byFramework = {};
  for (const r of lines) {
    (byFramework[r.framework] ||= []).push(r);
  }

  const summary = { generatedAt: new Date().toISOString(), byFramework: {} };

  console.log('\n=== Summary ===');
  for (const [fw, records] of Object.entries(byFramework)) {
    const durations = records.map((r) => r.durationMs);
    const failures = records.filter((r) => r.exitCode !== 0).length;
    const sorted = [...durations].sort((a, b) => a - b);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = durations.reduce((a, b) => a + (b - mean) ** 2, 0) / durations.length;
    const stdev = Math.sqrt(variance);
    const line = `${fw}: n=${durations.length} mean=${mean.toFixed(0)}ms median=${median}ms stdev=${stdev.toFixed(0)}ms min=${sorted[0]}ms max=${sorted[sorted.length - 1]}ms non-zero-exit-runs=${failures}`;
    console.log(line);
    summary.byFramework[fw] = {
      n: durations.length,
      meanMs: Math.round(mean),
      medianMs: median,
      stdevMs: Math.round(stdev),
      minMs: sorted[0],
      maxMs: sorted[sorted.length - 1],
      nonZeroExitRuns: failures,
    };
  }
  fs.writeFileSync(path.join(HERE, 'summary.json'), JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
