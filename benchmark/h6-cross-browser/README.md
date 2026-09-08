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
gap, not flakiness. Two of the three row-lookup timeouts (`creates a new
user`, `edits an existing user`) also reproduced 100% both times — a real
race condition, not flakiness either, on closer look. Only
`can enroll in an available course` was genuinely intermittent (failed
run 1, passed run 2) — an echo of H2's broader flakiness finding. Raw line
count (`git diff --stat`) favors Selenium (22 vs. 40 lines), and the gap
*widens* once comment-only lines are excluded (9 vs. 29 SLOC — see the
results doc's `benchmark/lib/loc.js`-based breakdown), since Selenium's
diff was proportionally more comment prose than Playwright's; either way,
that number alone is misleading here and effort-to-reach-parity is the
fairer framing.

**Post-hoc fix**: both structural failures (the download crash and the
row-lookup race) were root-caused and fixed — see the results doc's "Both
root causes, found and fixed" section for the diagnosis, the fix, and its
own size (28 raw / 9 SLOC / 19 comment-only lines). Confirmed via a Chrome
regression run.

**Re-verification (2026-09-08, Firefox now installed)**: re-running the
two-pass Firefox comparison against the fixed code did **not** land clean
— it surfaced 2 more instances of the exact same unguarded-redirect race
(`AdminUsersPage.editUser()`, `ProfessorCoursesPage.manageStudents()`),
found and fixed the same way (3 more SLOC). Only after that second round
did Firefox go clean-ish: 42/42, then 41/42 (one already-documented,
deliberately-unfixed timing flake, a new instance of the same category as
the original `can enroll in an available course` finding). Playwright was
also re-run twice against current code: 45/45 both times, unchanged. Full
logs appended to `playwright-firefox-run.log` / `selenium-firefox-run.log`
in this folder; full writeup in the results doc's H6 section.

**Verdict is Mixed, not Supported**: even after 3 debugging rounds fixing
4 distinct bugs, Selenium's total code (9 + 9 + 3 = 21 SLOC) is still less
than Playwright's 29 — the SLOC metric this thesis uses everywhere else
contradicts the hypothesis here. The case for Playwright is now a
repeatedly re-confirmed qualitative one: clean on every one of 4 runs
across 2 sessions, vs. Selenium needing 3 real debugging rounds to reach
parity, 2 of which only surfaced once Firefox was actually available to
test against locally. Still not a quantitative result on the same footing
as H1–H5. See the results doc's H6 section for the full reasoning.

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
