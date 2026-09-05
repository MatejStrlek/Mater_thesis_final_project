#!/usr/bin/env node
/**
 * H4 — Locator Resilience and Maintainability
 * "Playwright test suites rely more heavily on resilient, user-facing
 * locators than Selenium suites, which favor lower-level selectors."
 *
 * Counting rubric — classified by regex over `pages/` source only (the
 * Page Object layer, where locators are actually defined in both
 * suites), grouped into three buckets:
 *
 *   Playwright:
 *     "semantic" — getByRole/getByLabel/getByText/getByPlaceholder/
 *                  getByAltText/getByTitle
 *     "testid"   — getByTestId(...), and .locator(...) calls whose
 *                  argument contains "data-testid" (the suite's own
 *                  documented row-scoping pattern via
 *                  [data-testid^="prefix-"] attribute-prefix matching,
 *                  used because a row's numeric DB id isn't known before
 *                  it's created — a controlled, resilient choice, not a
 *                  fragile one)
 *     "fragile"  — any other .locator(...) call (raw CSS/XPath/text=
 *                  selector engine). Verified by hand: only 1 such call
 *                  exists in this suite's pages/ (a bare 'strong' tag
 *                  selector in ProfessorGradingPage) — the other 19 raw
 *                  .locator() calls are all the testid-prefix pattern
 *                  above and are bucketed there instead.
 *
 *   Selenium:
 *     "semantic" — findByLabel/fillByLabel/setValueByLabel/
 *                  selectByLabel calls (this suite's own getByLabel()
 *                  equivalent)
 *     "testid"   — By.css(...) calls whose argument contains
 *                  "data-testid"
 *     "fragile"  — By.css(...) without "data-testid", plus By.xpath(...)
 *                  and By.id(...)
 *     BasePage.ts's own findByLabel/fillByLabel/setValueByLabel/
 *     selectByLabel *declarations* (not calls) are excluded from the
 *     semantic count — a function signature matching its own name via
 *     regex isn't a locator usage. Likewise, BasePage.ts's internal
 *     By.xpath(//label[...])/By.id(forId) pair — the guts of
 *     findByLabel() itself, already counted once as that one semantic
 *     call — is excluded from the fragile count so the same lookup isn't
 *     counted twice under two different labels. Both exclusions verified
 *     by hand against the real file (see comments in code below).
 *
 * This is a regex pass over single-line calls — the numbers above were
 * hand-verified once already (see thesis Chapter 5 notes); re-verify a
 * ~20-30 item sample again if either suite's pages/ changes materially
 * before citing updated totals.
 *
 * Usage: node benchmark/h4-locator-resilience/analyze.js
 */

const fs = require('fs');
const path = require('path');

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

function classifyPlaywrightLocators(root) {
  const files = walk(path.join(root, 'pages'));
  const counts = { semantic: 0, testid: 0, fragile: 0 };
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8');
    counts.semantic += (content.match(/\.getByRole\(/g) || []).length;
    counts.semantic += (content.match(/\.getByLabel\(/g) || []).length;
    counts.semantic += (content.match(/\.getByText\(/g) || []).length;
    counts.semantic += (content.match(/\.getByPlaceholder\(/g) || []).length;
    counts.semantic += (content.match(/\.getByAltText\(/g) || []).length;
    counts.semantic += (content.match(/\.getByTitle\(/g) || []).length;
    counts.testid += (content.match(/\.getByTestId\(/g) || []).length;

    const locatorCalls = content.match(/\.locator\(([^)]*)\)/g) || [];
    for (const call of locatorCalls) {
      if (call.includes('data-testid')) counts.testid++;
      else counts.fragile++;
    }
  }
  return counts;
}

function classifySeleniumLocators(root) {
  const files = walk(path.join(root, 'pages'));
  const counts = { semantic: 0, testid: 0, fragile: 0 };
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8');
    let semanticHits =
      (content.match(/\bfindByLabel\(/g) || []).length +
      (content.match(/\bfillByLabel\(/g) || []).length +
      (content.match(/\bsetValueByLabel\(/g) || []).length +
      (content.match(/\bselectByLabel\(/g) || []).length;
    // BasePage.ts lines 30/40/57/68 are the 4 method *declarations*
    // themselves, each self-matching its own name once — not a locator
    // usage. The 3 genuine internal calls to findByLabel() from within
    // fillByLabel/setValueByLabel/selectByLabel's bodies stay counted.
    if (path.basename(f) === 'BasePage.ts') semanticHits -= 4;
    counts.semantic += semanticHits;

    const cssCalls = content.match(/By\.css\(([^)]*)\)/g) || [];
    for (const call of cssCalls) {
      if (call.includes('data-testid')) counts.testid++;
      else counts.fragile++;
    }

    // BasePage.ts's By.xpath(//label[...]) + By.id(forId) (lines 32/37)
    // are findByLabel()'s own internal implementation, already counted
    // once above as that one semantic call — not an independent locator
    // choice a page object made.
    if (path.basename(f) === 'BasePage.ts') continue;
    counts.fragile += (content.match(/By\.xpath\(/g) || []).length;
    counts.fragile += (content.match(/By\.id\(/g) || []).length;
  }
  return counts;
}

function main() {
  const pw = classifyPlaywrightLocators(PLAYWRIGHT_DIR);
  const se = classifySeleniumLocators(SELENIUM_DIR);
  const pwTotal = pw.semantic + pw.testid + pw.fragile;
  const seTotal = se.semantic + se.testid + se.fragile;

  console.log('=== Locator classification (pages/ only) ===');
  console.log(
    `Playwright: semantic=${pw.semantic} testid=${pw.testid} fragile=${pw.fragile} ` +
      `(total ${pwTotal}, ${((1 - pw.fragile / pwTotal) * 100).toFixed(0)}% non-fragile)`,
  );
  console.log(
    `Selenium:   semantic=${se.semantic} testid=${se.testid} fragile=${se.fragile} ` +
      `(total ${seTotal}, ${((1 - se.fragile / seTotal) * 100).toFixed(0)}% non-fragile)`,
  );

  const results = { generatedAt: new Date().toISOString(), playwright: pw, selenium: se };
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  console.log('\nWritten to benchmark/h4-locator-resilience/results.json');
}

main();
