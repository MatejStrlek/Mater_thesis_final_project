#!/usr/bin/env node
/**
 * H5 — Code Volume and Expressiveness
 * "Playwright suites require less code to express equivalent test
 * coverage than Selenium suites."
 *
 * Counting rubric:
 *   - Two metrics are reported per directory: raw LOC (`split('\n').length`,
 *     including blank lines *and* comments) and SLOC (comments excluded —
 *     see `../lib/loc.js`). Raw LOC is kept for continuity with earlier
 *     runs of this script, but SLOC is the metric actually used in the
 *     results writeup and verdict: a comment doesn't run, so a file with
 *     more of them isn't "more code," and the two sibling repos follow
 *     different comment conventions (this repo's CLAUDE.md defaults to no
 *     comments; Selenium's Page Objects/utils carry heavy rationale-comment
 *     blocks throughout) — raw LOC was partly measuring documentation
 *     style, not framework verbosity. Blank lines are still counted in
 *     SLOC, matching the original rubric's explicit choice on that point;
 *     only comment-only lines are removed.
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
const { countSourceLines } = require('../lib/loc');

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

function countFiles(files) {
  return files.reduce(
    (sum, f) => {
      const c = countSourceLines(fs.readFileSync(f, 'utf-8'));
      return { lines: sum.lines + c.total, sloc: sum.sloc + c.sloc, commentOnly: sum.commentOnly + c.commentOnly };
    },
    { lines: 0, sloc: 0, commentOnly: 0 },
  );
}

function locDirs(root, dirNames) {
  const result = {};
  for (const name of dirNames) {
    const files = walk(path.join(root, name));
    result[name] = { files: files.length, ...countFiles(files) };
  }
  return result;
}

function locComparableTests(root) {
  const files = RELATIVE_SPECS.map((rel) => path.join(root, 'tests', ...rel.split('/')));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length) throw new Error(`Missing expected comparable spec files: ${missing.join(', ')}`);
  return { files: files.length, ...countFiles(files) };
}

function main() {
  const pwLoc = locDirs(PLAYWRIGHT_DIR, ['pages', 'fixtures']);
  const seLoc = locDirs(SELENIUM_DIR, ['pages']);
  pwLoc.tests = locComparableTests(PLAYWRIGHT_DIR);
  seLoc.tests = locComparableTests(SELENIUM_DIR);
  pwLoc.utils = {
    files: 2,
    ...countFiles(['env.ts', 'test-data.ts'].map((f) => path.join(PLAYWRIGHT_DIR, 'utils', f))),
  };
  seLoc.utils = locDirs(SELENIUM_DIR, ['utils']).utils;

  const sumField = (loc, field, ...dirs) => dirs.reduce((s, d) => s + loc[d][field], 0);
  pwLoc.total = sumField(pwLoc, 'lines', 'tests', 'pages', 'fixtures', 'utils');
  seLoc.total = sumField(seLoc, 'lines', 'tests', 'pages', 'utils');
  pwLoc.totalSloc = sumField(pwLoc, 'sloc', 'tests', 'pages', 'fixtures', 'utils');
  seLoc.totalSloc = sumField(seLoc, 'sloc', 'tests', 'pages', 'utils');
  pwLoc.totalCommentOnly = sumField(pwLoc, 'commentOnly', 'tests', 'pages', 'fixtures', 'utils');
  seLoc.totalCommentOnly = sumField(seLoc, 'commentOnly', 'tests', 'pages', 'utils');

  console.log('=== Code volume (comparable 12-spec scope only) ===');
  console.log('Playwright:', JSON.stringify(pwLoc, null, 2));
  console.log('Selenium:  ', JSON.stringify(seLoc, null, 2));
  console.log(
    `\nRaw LOC: Selenium requires ${(((seLoc.total - pwLoc.total) / pwLoc.total) * 100).toFixed(0)}% more lines for the same comparable coverage.`,
  );
  console.log(
    `SLOC (comments excluded): Selenium requires ${(((seLoc.totalSloc - pwLoc.totalSloc) / pwLoc.totalSloc) * 100).toFixed(0)}% more lines for the same comparable coverage.`,
  );
  console.log(
    `Comment-only lines: Playwright ${pwLoc.totalCommentOnly}/${pwLoc.total} (${((pwLoc.totalCommentOnly / pwLoc.total) * 100).toFixed(0)}%), Selenium ${seLoc.totalCommentOnly}/${seLoc.total} (${((seLoc.totalCommentOnly / seLoc.total) * 100).toFixed(0)}%).`,
  );

  const results = { generatedAt: new Date().toISOString(), playwright: pwLoc, selenium: seLoc };
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  console.log('\nWritten to benchmark/h5-code-volume/results.json');
}

main();
