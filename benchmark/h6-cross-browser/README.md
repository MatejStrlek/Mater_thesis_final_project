# H6 — Cross-Browser Extension Effort

**Hypothesis**: Extending an E2E suite to an additional browser engine requires less additional effort in Playwright than in Selenium WebDriver.

## Status: done

Firefox added for real to both suites (not simulated), then run against
the same 12 comparable specs — twice, container restarted fresh both
times, to check reproducibility. Full writeup:
[`docs/FRAMEWORK-EVALUATION-RESULTS.md`](../../docs/FRAMEWORK-EVALUATION-RESULTS.md)'s
H6 section. Current state (2026-09-08):

- Playwright: **45/45 passed, both runs** (`playwright-firefox-run.log`).
- Selenium: **42/42 passed, both runs** (`selenium-firefox-run.log`).

Both suites pass cleanly and reproducibly on Firefox. Getting Selenium to
that state required root-causing and fixing 4 distinct bugs found only by
actually running the suite: a Chromium-only `setDownloadPath()` call with
no Firefox equivalent, and three separate instances of the same
unguarded-redirect race (form/link clicks that didn't wait for the
resulting navigation before returning control to the test —
`AdminUsersPage.createUser()`, `AdminUsersPage.editUser()`,
`ProfessorCoursesPage.manageStudents()`). Playwright's diff needed no
debugging at any point.

**Line count** (`benchmark/lib/loc.js`-classified, not just `git diff --stat`):
Playwright's `playwright.config.ts` diff is 40 raw / 29 SLOC / 11
comment-only. Selenium's total diff (`utils/driver.ts` + the 3 race fixes
across 2 Page Objects) is 41 raw / 21 SLOC / 20 comment-only — still
smaller than Playwright's on SLOC even after fixing all 4 bugs.

**Verdict is Mixed, not Supported**: Selenium's total code (21 SLOC) is
still less than Playwright's (29 SLOC) — the SLOC metric this thesis uses
everywhere else contradicts the hypothesis here. What favors Playwright
is a qualitative effort difference: zero debugging needed to reach a
clean, reproducible Firefox pass, vs. Selenium's four root-caused bug
fixes. See the results doc's H6 section for the full reasoning.

## Method

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
3. **Measure**: lines of code/config changed in each repo, whether either
   suite needed any wait-timing or locator changes to actually pass on
   the second engine (not just "it ran" — did it pass without
   modification), and how long each change took to get right.

## Why this one is real engineering, not just measurement

Playwright's per-project `devices[...]` swap is expected to be closer to
a one-line change per project. Selenium's is expected to need more: a
new dependency import, a new options branch, and — per this suite's own
`CLAUDE.md` — untested territory, since every wait/timeout value in this
suite was originally tuned against Chrome specifically and had never
been verified against GeckoDriver's own behavior before this hypothesis
was run.

This was deliberately done after H1/H2's full data collection finished,
for exactly the reason above: it's real source-code engineering (in both
repos), and editing either suite's code mid-collection would have
invalidated the H1/H2 timing/stability numbers being gathered at the
time.
