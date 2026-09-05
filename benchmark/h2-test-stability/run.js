#!/usr/bin/env node
/**
 * H2 — Test Stability Under Repetition
 * "Selenium-based E2E tests are more prone to intermittent failures
 * (flakiness) than Playwright-based tests of equivalent scope."
 *
 * Both frameworks are measured with the *same recipe*, not two different
 * ones: N full-suite invocations, container restarted before each,
 * retries forced to 0, first-attempt pass/fail aggregated per test title
 * across all N runs via each framework's own JSON reporter. This is
 * deliberately more work than Playwright strictly needs on its own
 * (`--repeat-each=N --retries=0` inside one invocation would do, and its
 * HTML report already has a first-class `flaky` outcome once retries are
 * on) — but Mocha has no equivalent "repeat within one process" flag and
 * no `flaky` outcome at all, so applying Playwright's shortcut would make
 * this a methodologically different measurement per framework. Running
 * the identical recipe on both sides keeps the comparison honest.
 *
 * Usage:
 *   node benchmark/h2-test-stability/run.js [runs]   # default 10
 *
 * Output: playwright-runs/run-N.json, selenium-runs/run-N.json (raw JSON
 * reporter output per run), and playwright-summary.json /
 * selenium-summary.json (first-attempt failure rate per test, aggregated
 * across all N runs).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { restartContainer, waitReady, BASE_URL } = require('../lib/container');
const { PLAYWRIGHT_TEST_ARGS } = require('../lib/comparable-specs');

const HERE = __dirname;
const PLAYWRIGHT_DIR = path.resolve(HERE, '..', '..');
const SELENIUM_DIR = path.resolve(HERE, '..', '..', '..', 'Selenium-masters-thesis-code');

const N_RUNS = parseInt(process.argv[2] || '10', 10);

function runPlaywrightOnce(runIndex) {
  const outDir = path.join(HERE, 'playwright-runs');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `run-${runIndex}.json`);
  const env = {
    ...process.env,
    CI: 'true',
    BASE_URL,
    PLAYWRIGHT_JSON_OUTPUT_NAME: path.relative(PLAYWRIGHT_DIR, outFile),
  };
  const cmd = `npx playwright test ${PLAYWRIGHT_TEST_ARGS.join(' ')} --reporter=json --retries=0`;
  spawnSync(cmd, { cwd: PLAYWRIGHT_DIR, shell: true, env, encoding: 'utf-8' });
  if (!fs.existsSync(outFile)) throw new Error(`Playwright json reporter did not produce ${outFile}`);
  const report = JSON.parse(fs.readFileSync(outFile, 'utf-8'));

  /** @type {Array<{fullTitle: string, status: string}>} */
  const results = [];
  function walk(suite, titlePath) {
    for (const s of suite.suites || []) walk(s, [...titlePath, s.title]);
    for (const spec of suite.specs || []) {
      for (const test of spec.tests) {
        const fullTitle = `[${test.projectName}] ${[...titlePath, spec.title].join(' > ')}`;
        const status = test.results[test.results.length - 1].status;
        results.push({ fullTitle, status });
      }
    }
  }
  for (const s of report.suites || []) walk(s, [s.title]);
  return results;
}

function runSeleniumOnce(runIndex) {
  const outDir = path.join(HERE, 'selenium-runs');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `run-${runIndex}.json`);
  const env = { ...process.env, CI: 'true', HEADLESS: 'true', BASE_URL };
  const cmd = `npx mocha --reporter json --reporter-options output=${JSON.stringify(outFile)} --retries 0`;
  spawnSync(cmd, { cwd: SELENIUM_DIR, shell: true, env, encoding: 'utf-8' });
  if (!fs.existsSync(outFile)) throw new Error(`Mocha json reporter did not produce ${outFile}`);
  const report = JSON.parse(fs.readFileSync(outFile, 'utf-8'));

  const failedTitles = new Set(report.failures.map((f) => f.fullTitle));
  return report.tests.map((t) => ({
    fullTitle: t.fullTitle,
    status: failedTitles.has(t.fullTitle) ? 'failed' : 'passed',
  }));
}

function aggregate(perRunResults) {
  /** @type {Map<string, {pass: number, fail: number}>} */
  const perTest = new Map();
  for (const results of perRunResults) {
    for (const { fullTitle, status } of results) {
      const entry = perTest.get(fullTitle) || { pass: 0, fail: 0 };
      if (status === 'passed') entry.pass++;
      else entry.fail++;
      perTest.set(fullTitle, entry);
    }
  }
  const rows = [...perTest.entries()]
    .map(([title, { pass, fail }]) => ({ title, pass, fail, total: pass + fail }))
    .sort((a, b) => b.fail - a.fail);
  const flakyCount = rows.filter((r) => r.fail > 0 && r.fail < r.total).length;
  const alwaysFailCount = rows.filter((r) => r.fail === r.total && r.total > 0).length;
  return { rows, flakyCount, alwaysFailCount, totalTests: rows.length };
}

async function main() {
  const playwrightRuns = [];
  const seleniumRuns = [];

  console.log(`Running both suites ${N_RUNS} times each, retries disabled, container restarted before every run.`);
  for (let i = 1; i <= N_RUNS; i++) {
    console.log(`\n[${new Date().toISOString()}] restarting container before playwright run ${i}/${N_RUNS}...`);
    restartContainer();
    await waitReady();
    console.log(`[${new Date().toISOString()}] playwright run ${i}/${N_RUNS}...`);
    playwrightRuns.push(runPlaywrightOnce(i));

    console.log(`[${new Date().toISOString()}] restarting container before selenium run ${i}/${N_RUNS}...`);
    restartContainer();
    await waitReady();
    console.log(`[${new Date().toISOString()}] selenium run ${i}/${N_RUNS}...`);
    seleniumRuns.push(runSeleniumOnce(i));
  }

  const pwSummary = aggregate(playwrightRuns);
  const seSummary = aggregate(seleniumRuns);

  fs.writeFileSync(path.join(HERE, 'playwright-summary.json'), JSON.stringify(pwSummary, null, 2));
  fs.writeFileSync(path.join(HERE, 'selenium-summary.json'), JSON.stringify(seSummary, null, 2));

  console.log('\n=== Playwright ===');
  console.log(
    `${pwSummary.totalTests} tests, ${pwSummary.flakyCount} intermittent, ${pwSummary.alwaysFailCount} always-failed`,
  );
  console.log('\n=== Selenium ===');
  console.log(
    `${seSummary.totalTests} tests, ${seSummary.flakyCount} intermittent, ${seSummary.alwaysFailCount} always-failed`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
