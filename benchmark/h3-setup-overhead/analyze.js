#!/usr/bin/env node
/**
 * H3 — Initial Setup Overhead
 * "Playwright requires less initial setup effort (dependencies,
 * configuration, boilerplate) to reach a first working test than
 * Selenium WebDriver."
 *
 * Counting rubric:
 *   - Dependencies: direct `dependencies` + `devDependencies` keys in
 *     package.json only (not transitive — `npm ls` would double-count
 *     shared transitive deps between the two ecosystems unfairly).
 *   - Config files: a fixed, explicit list per repo (below), not
 *     auto-discovered — auto-discovery would need its own arbitrary
 *     judgment call about what "counts" as config.
 *   - Read from the **live filesystem** — whatever's currently on disk in
 *     each repo, committed or not. This means the numbers move as either
 *     suite changes: e.g. `playwright.config.ts` grew once H6 added its
 *     Firefox projects to it, and that growth is deliberately reflected
 *     here rather than frozen at an earlier snapshot — this script always
 *     reports the suites' actual current state.
 *
 * Usage: node benchmark/h3-setup-overhead/analyze.js
 */

const fs = require('fs');
const path = require('path');

const PLAYWRIGHT_DIR = path.resolve(__dirname, '..', '..');
const SELENIUM_DIR = path.resolve(__dirname, '..', '..', '..', 'Selenium-masters-thesis-code');

function depCount(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  return { dependencies: deps, devDependencies: devDeps, total: deps.length + devDeps.length };
}

function configLoc(root, files) {
  const result = {};
  let total = 0;
  for (const f of files) {
    const full = path.join(root, f);
    if (!fs.existsSync(full)) {
      result[f] = null;
      continue;
    }
    const lines = fs.readFileSync(full, 'utf-8').split('\n').length;
    result[f] = lines;
    total += lines;
  }
  result.total = total;
  return result;
}

function main() {
  const pwDeps = depCount(PLAYWRIGHT_DIR);
  const seDeps = depCount(SELENIUM_DIR);
  const pwConfig = configLoc(PLAYWRIGHT_DIR, ['playwright.config.ts', 'tsconfig.json']);
  const seConfig = configLoc(SELENIUM_DIR, ['.mocharc.json', 'tsconfig.json']);

  console.log('=== Dependencies (direct, package.json) ===');
  console.log(`Playwright: ${pwDeps.total} — ${pwDeps.dependencies.concat(pwDeps.devDependencies).join(', ')}`);
  console.log(`Selenium:   ${seDeps.total} — ${seDeps.dependencies.concat(seDeps.devDependencies).join(', ')}`);

  console.log('\n=== Config file line counts ===');
  console.log('Playwright:', JSON.stringify(pwConfig, null, 2));
  console.log('Selenium:  ', JSON.stringify(seConfig, null, 2));

  const results = {
    generatedAt: new Date().toISOString(),
    dependencies: { playwright: pwDeps, selenium: seDeps },
    config: { playwright: pwConfig, selenium: seConfig },
  };
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  console.log('\nWritten to benchmark/h3-setup-overhead/results.json');
}

main();
