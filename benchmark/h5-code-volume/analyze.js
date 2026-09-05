#!/usr/bin/env node
/**
 * H5 — Code Volume and Expressiveness
 * "Playwright suites require less code to express equivalent test
 * coverage than Selenium suites."
 *
 * Counting rubric:
 *   - LOC: raw line count (`split('\n').length`), including blank lines
 *     and comments, summed per directory. No "logical LOC" heuristic —
 *     a simpler, more defensible rule than trying to guess what counts
 *     as "real" code.
 *   - `tests/` is scoped to exactly the 12 spec files both suites share
 *     (see ../lib/comparable-specs.js) — Playwright's own suite has 10
 *     more files (visual regression, network-mocking, API tests) that
 *     are explicitly out of scope for the framework comparison (see
 *     docs/FRAMEWORK-EVALUATION.md's precondition); counting them would
 *     overstate Playwright's code volume for work it isn't being
 *     compared on.
 *   - `utils/` is scoped per-repo to files the comparable 12-spec scope
 *     actually uses: Playwright's `api-client.ts`/`axe.ts` support only
 *     the out-of-scope API/accessibility tests and are excluded; all 4
 *     of Selenium's utils files (including `driver.ts`/`downloads.ts`,
 *     which have no Playwright equivalent at all) are in scope, since
 *     that asymmetry — Selenium needing its own driver-lifecycle and
 *     download-polling plumbing where Playwright needs none — is itself
 *     real comparison data, not noise to normalize away.
 *   - `pages/` and `fixtures/` are counted in full for both — both
 *     suites' Page Object sets already match 1:1 file-for-file, and
 *     Playwright's `fixtures/index.ts` having no Selenium counterpart at
 *     all is, likewise, real data.
 *   - Read from the **live filesystem** — whatever's currently on disk in
 *     each repo, committed or not. This means the numbers move as either
 *     suite changes: e.g. Selenium's `utils/driver.ts` grew once H6 added
 *     its Firefox branch, and that growth is deliberately reflected here
 *     rather than frozen at an earlier snapshot — this script always
 *     reports the suites' actual current state.
 *
 * Usage: node benchmark/h5-code-volume/analyze.js
 */

const fs = require('fs');
const path = require('path');
const { RELATIVE_SPECS } = require('../lib/comparable-specs');

const PLAYWRIGHT_DIR = path.resolve(__dirname, '..', '..');
const SELENIUM_DIR = path.resolve(__dirname, '..', '..', '..', 'Selenium-masters-thesis-code');

function walk(dir, exts = ['.ts']) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function countLines(files) {
  return files.reduce((sum, f) => sum + fs.readFileSync(f, 'utf-8').split('\n').length, 0);
}

function locDirs(root, dirNames) {
  const result = {};
  for (const name of dirNames) {
    const files = walk(path.join(root, name));
    result[name] = { files: files.length, lines: countLines(files) };
  }
  return result;
}

function locComparableTests(root) {
  const files = RELATIVE_SPECS.map((rel) => path.join(root, 'tests', ...rel.split('/')));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length) throw new Error(`Missing expected comparable spec files: ${missing.join(', ')}`);
  return { files: files.length, lines: countLines(files) };
}

function main() {
  const pwLoc = locDirs(PLAYWRIGHT_DIR, ['pages', 'fixtures']);
  const seLoc = locDirs(SELENIUM_DIR, ['pages']);
  pwLoc.tests = locComparableTests(PLAYWRIGHT_DIR);
  seLoc.tests = locComparableTests(SELENIUM_DIR);
  pwLoc.utils = {
    files: 2,
    lines: countLines(['env.ts', 'test-data.ts'].map((f) => path.join(PLAYWRIGHT_DIR, 'utils', f))),
  };
  seLoc.utils = locDirs(SELENIUM_DIR, ['utils']).utils;
  pwLoc.total = pwLoc.tests.lines + pwLoc.pages.lines + pwLoc.fixtures.lines + pwLoc.utils.lines;
  seLoc.total = seLoc.tests.lines + seLoc.pages.lines + seLoc.utils.lines;

  console.log('=== Code volume (LOC, raw line count, comparable 12-spec scope only) ===');
  console.log('Playwright:', JSON.stringify(pwLoc, null, 2));
  console.log('Selenium:  ', JSON.stringify(seLoc, null, 2));
  console.log(
    `\nSelenium requires ${(((seLoc.total - pwLoc.total) / pwLoc.total) * 100).toFixed(0)}% more lines for the same comparable coverage.`,
  );

  const results = { generatedAt: new Date().toISOString(), playwright: pwLoc, selenium: seLoc };
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  console.log('\nWritten to benchmark/h5-code-volume/results.json');
}

main();
