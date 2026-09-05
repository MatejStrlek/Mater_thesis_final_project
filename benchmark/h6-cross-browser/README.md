# H6 — Cross-Browser Extension Effort

**Hypothesis**: Extending an E2E suite to an additional browser engine requires less additional effort in Playwright than in Selenium WebDriver.

## Status: done (confirmed with a second run)

Firefox added for real to both suites (not simulated), then run against
the same 12 comparable specs — twice, container restarted fresh both
times, specifically to check reproducibility. Full writeup:
[`docs/FRAMEWORK-EVALUATION-RESULTS.md`](../../docs/FRAMEWORK-EVALUATION-RESULTS.md)'s
H6 section. Short version:

- Playwright: **45/45 passed, both runs** (`playwright-firefox-run.log`).
- Selenium run 1: 36 passed / 4 failed / 2 never ran.
- Selenium run 2: 37 passed / 3 failed / 2 never ran.
- Both Selenium runs are in `selenium-firefox-run.log`, one after the other.

One Selenium failure (`driver.setDownloadPath is not a function` — no
Firefox equivalent of Chrome's DevTools download API in this
`selenium-webdriver` version) reproduced 100% both times — a structural
gap, not flakiness. The row-lookup timeouts didn't: one of the three
failed only in run 1, passing cleanly in run 2 — genuinely intermittent
on Firefox, an echo of H2's broader flakiness finding surfacing again
here. Raw line count (`git diff --stat`) actually favors Selenium (22 vs.
40 lines) — see the results doc for why that number alone is misleading
here and effort-to-reach-parity is the fairer framing.

## Method actually used (matches the original plan below)

1. **Playwright side**: add a `firefox` project to `playwright.config.ts`
   (each existing per-role project's `use` already sets
   `devices['Desktop Chrome']` — add a parallel Firefox variant using
   `devices['Desktop Firefox']`), then run the 12 comparable specs
   against it.
2. **Selenium side**: add Firefox support to `utils/driver.ts`'s
   `createDriver()` — a new `firefox.Options()` branch via
   `selenium-webdriver/firefox` (GeckoDriver, resolved automatically by
   Selenium Manager same as Chrome), gated by an env var or parameter,
   then run the same 12 specs against it.
3. **Measure**: lines of code/config changed in each repo (`git diff
   --stat` on the two commits), whether either suite needed any
   wait-timing or locator changes to actually pass on the second engine
   (not just "it ran" — did it pass without modification), and how long
   each change took to get right.

## Why this one is real engineering, not just measurement

Playwright's per-project `devices[...]` swap is expected to be closer to
a one-line change per project. Selenium's is expected to need more:  a
new dependency import, a new options branch, and — per this suite's own
`CLAUDE.md` — untested territory, since every wait/timeout value in this
suite (`DEFAULT_TIMEOUT`, the CI-only sandbox flags, the headless
viewport fix from blocker #1) was tuned against Chrome specifically and
has never been verified against GeckoDriver's own behavior.

This was deliberately done after H1/H2's full data collection finished,
for exactly the reason above: it's real source-code engineering (in both
repos), and editing either suite's code mid-collection would have
invalidated the H1/H2 timing/stability numbers being gathered at the
time. (This actually happened once during H1's 10-round run — Playwright's
Firefox projects were added too early, caught before any run was
affected, and reverted until data collection finished.)
