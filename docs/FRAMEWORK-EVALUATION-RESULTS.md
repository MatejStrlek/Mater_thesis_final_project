# Framework Evaluation — Results (Thesis Chapter 5.3)

Per-hypothesis comparison, built from the raw data each script under
[`benchmark/`](../benchmark/) produces. See
[`FRAMEWORK-EVALUATION.md`](FRAMEWORK-EVALUATION.md) for the methodology,
metrics, and precondition (both suites scoped to the 12 spec files /
42 tests they share). Source data lives entirely in this repo — nothing
was added to the sibling Selenium repo.

**How to read the verdicts below**: "Supported" means the data points the
predicted direction with enough evidence to state it plainly — a
deterministic static count, or a timing/stability gap backed by enough
sample runs. All six hypotheses below reached this bar.

---

## H1 — Execution Speed Advantage

> Playwright executes an equivalent-scope E2E suite faster than Selenium WebDriver.

**Metric**: wall-clock execution time, both suites scoped to the same 12
spec files (42 tests), container restarted before every run, N repeated
runs, alternating order. Script: `benchmark/h1-execution-speed/run.js`.

**Data** (15 rounds / 15 runs per framework, final,
`benchmark/h1-execution-speed/summary.json`, 2026-09-05):

| | Playwright | Selenium |
|---|---|---|
| n | 15 | 15 |
| Mean | **33.7s** | **335.3s** |
| Median | 33.6s | 357.1s |
| Stdev | 4.3s | 80.2s |
| Min | 30.8s | 199.5s |
| Max | 48.6s | 502.4s |
| Non-zero-exit runs | 0/15 | **11/15** |

**A note on test counts, checked directly rather than assumed**: each
Playwright run's own summary reports 45 tests, not 42. Verified via
`npx playwright test <the 12 files> --list`: 45 = the 42 comparable tests
+ 3 `[setup]` project runs (`authenticate as admin/professor/student`,
which produce the `storageState` files the `admin`/`professor`/`student`
projects depend on). Including those 3 in the measured time is the
correct call, not a scoping bug or a thumb on the scale: Playwright pays
a real login cost 3 times total (once per role, reused via `storageState`
across every test that needs it), while Selenium pays a fresh login cost
inside nearly every one of its 42 tests' own `beforeEach`. Excluding the
setup runs would hide real, necessary work specific to Playwright's own
authentication architecture and artificially flatter its number.

Playwright is **~9.9x faster on average**. The two ranges still don't
overlap at all even at the full n=15 — Playwright's single slowest run
(48.6s) is still faster than Selenium's single fastest run (199.5s).
Complete separation between two groups of 15 is decisively significant
under a Mann-Whitney U test (U=225, the maximum possible value, p<0.0001).

Playwright's own 15 durations are also tight and consistent (30.8–48.6s,
stdev 4.3s — one mild outlier at 48.6s, otherwise 30–35s throughout).
Selenium's spread is much wider (199.5–502.4s, stdev 80.2s) — itself a
second, independent finding: Selenium's execution time is far less
predictable run-to-run, not just slower on average.

**Verdict**: **Supported**, with high confidence — full n=15 collected,
complete separation between groups. ~9.9x is the number to cite.

**Note**: measured using each suite's own normal configuration (Selenium's
`retries: 2` still active, not forced to 0) — see H2 below for what that
revealed as a side effect of measuring H1.

---

## H2 — Test Stability Under Repetition

> Selenium-based E2E tests are more prone to intermittent failures (flakiness) than Playwright-based tests of equivalent scope.

**Metric**: both suites run N times, container restarted before every
run, retries forced to 0, first-attempt pass/fail aggregated per test
across all N runs from each framework's own JSON reporter. Script:
`benchmark/h2-test-stability/run.js`.

**Data**: dedicated retries-disabled script not yet run at full N (see
`benchmark/h2-test-stability/playwright-summary.json` /
`selenium-summary.json` once populated) — but the full 15-round H1 timing
run produced substantial real evidence as a side effect, using each
suite's own *normal* configuration (Selenium's `retries: 2` still active,
not forced to 0):

| | Playwright | Selenium |
|---|---|---|
| Runs | 15 | 15 |
| Runs with ≥1 failure | **0 (0%)** | **11 (73.3%)** |
| Total individual test failures | 0 | **21** |
| Exit codes across all 15 runs | all `0` | `1,3,2,0,0,0,1,2,3,3,0,2,1,2,1` |

21 individual test failures across 630 test executions (42 tests × 15
runs) is a ~3.3% per-test failure rate for Selenium — small per test, but
it compounds at the run level: with 42 tests each carrying some chance of
a spurious timeout, **73.3% of full-suite runs hit at least one failure**,
even with Mocha's own `retries: 2` already trying to absorb it. Counted
directly from every run log: **20 of the 21 failures** are the same
shape — `TimeoutError`, an element-located wait timing out at ~15s (this
suite's `DEFAULT_TIMEOUT`) — spread across many different tests and Page
Objects (admin content, professor content, professor grading, admin
users, student permissions, and others), not concentrated in one bad
test. The 1 exception is a different error class: a Mocha-level
`afterEach` hook timeout (`Timeout of 30000ms exceeded`) on `Professor
course content management > deletes a content item via the confirm
modal`, in the same run as (but not the same test as) an `edits an
existing content item` failure — still a timing problem, just one layer
up from the other 20. That 20-of-21 pattern is a systemic issue
consistent with this repo's own previously-documented root cause
(tail-latency variance from launching many sequential Chrome processes,
here severe enough that 2 retries weren't always enough to absorb it).

Every one of the 15 Playwright runs passed cleanly — 0 failures, 0/15
runs affected.

**Verdict**: **Strongly supported**, even ahead of the dedicated
retries-disabled script. A 73.3% run-level failure rate against 0% is
not a subtle effect that needs a first-attempt-only recount to see — the
retries-disabled script (`benchmark/h2-test-stability/run.js`) would
still sharpen the exact first-attempt failure rate per test for a more
precise number, but the practical conclusion is already unambiguous.

---

## H3 — Initial Setup Overhead

> Playwright requires less initial setup effort (dependencies, configuration, boilerplate) to reach a first working test than Selenium WebDriver.

**Metric**: direct `package.json` dependency count, fixed config file
line counts — both raw and SLOC (comments excluded, see
`benchmark/lib/loc.js`; material here specifically because
`playwright.config.ts` carries real explanatory comment blocks its
Selenium counterparts, plain JSON, can't carry at all). Script:
`benchmark/h3-setup-overhead/analyze.js`.

**Data**:

| | Playwright | Selenium |
|---|---|---|
| Direct dependencies | **3** (`@axe-core/playwright`, `@playwright/test`, `@types/node`) | **10** (`@types/chai`, `@types/mocha`, `@types/node`, `@types/selenium-webdriver`, `chai`, `dotenv`, `mocha`, `selenium-webdriver`, `ts-node`, `typescript`) |
| Config file lines (raw) | **124** (`playwright.config.ts` 112 + `tsconfig.json` 12) | **23** (`.mocharc.json` 8 + `tsconfig.json` 15) |
| Config file lines (SLOC) | **98** (`playwright.config.ts` 86 + `tsconfig.json` 12) | **23** (`.mocharc.json` 8 + `tsconfig.json` 15) |

Config file lines are read live off disk, so this total includes H6's 5
Firefox projects added to `playwright.config.ts` (+40 raw / +29 SLOC lines)
— the before-H6 SLOC figure was 69 (57+12); it grew once cross-browser
support was added to that same file. Treated as real, current state rather
than a frozen earlier snapshot. Selenium's two config files are plain
JSON — no comment syntax exists for them to carry, so their raw and SLOC
figures are identical by construction, not because they're equally
information-dense.

**Reading this honestly**: dependency count clearly favors Playwright
(3 vs. 10 — Selenium ships no test runner, assertion library, or
TypeScript tooling of its own, so a working suite needs Mocha, Chai, and
`ts-node` on top of `selenium-webdriver` itself). Config *line count*
still favors Selenium either way it's counted (23 vs. 124 raw, 23 vs. 98
SLOC) — but that's because `playwright.config.ts` does much more per line
(per-role projects, `storageState`/`dependencies` wiring, trace/reporter
config, and now cross-browser projects too) than Selenium's two small
config files, which configure almost nothing beyond the spec glob and
retry count. Stripping comments narrows the gap from 5.4x to 4.3x but
doesn't close it — line count alone still understates what
`playwright.config.ts` is actually doing; dependency count is the more
honest half of this metric.

**Verdict**: **Supported** — on the dependency-count half, decisively (3
vs. 10, a >3x gap.) The config-LOC half is genuinely mixed and should be
presented with the caveat above, not cited as a clean win either way.

---

## H4 — Locator Resilience and Maintainability

> Playwright test suites rely more heavily on resilient, user-facing locators than Selenium suites, which favor lower-level selectors.

**Metric**: locator calls in `pages/` classified as semantic / testid /
fragile (see `benchmark/h4-locator-resilience/analyze.js` header for the
full rubric, including two hand-verified corrections — Playwright's
`[data-testid^="prefix-"]` row-scoping calls reclassified from "fragile"
to "testid", and Selenium's `BasePage.ts` internal helper-implementation
lines excluded from double-counting).

**Data**:

| | Playwright | Selenium |
|---|---|---|
| Semantic | 37 | 30 |
| Testid | 40 | 53 |
| Fragile | **1** | **16** |
| Total | 78 | 99 |
| Non-fragile | **99%** | **84%** |

**Verdict**: **Supported.** Playwright's suite has essentially one
fragile locator in its entire Page Object layer; Selenium's has 16,
mostly `By.xpath(...)` row-lookups — a real, structural gap: Selenium has
no equivalent of Playwright's `getByRole('row', { name })` for matching a
table row by its full text content, so every row-lookup in this suite
falls back to raw XPath by necessity, not by choice.

---

## H5 — Code Volume and Expressiveness

> Playwright suites require less code to express equivalent test coverage than Selenium suites.

**Metric**: LOC across `tests/` (scoped to the 12 comparable specs),
`pages/`, `utils/` (scoped to files the comparable specs actually use),
and `fixtures/` (Playwright only) — both raw line count and SLOC (comments
excluded, see `benchmark/lib/loc.js`). SLOC is the metric the verdict
below is actually based on: a comment doesn't run, and the two sibling
repos follow different comment conventions (this repo's own CLAUDE.md
defaults to no comments; Selenium's Page Objects/utils carry heavy
rationale-explaining comment blocks throughout), so raw LOC alone was
partly measuring documentation style rather than framework verbosity.
Script: `benchmark/h5-code-volume/analyze.js`.

**Data**:

| | Playwright (raw / SLOC) | Selenium (raw / SLOC) |
|---|---|---|
| `tests/` (12 files) | 741 / 669 | 864 / 809 |
| `pages/` (13 files) | 573 / 488 | 864 / 705 |
| `utils/` | 118 / 60 (2 files) | 152 / 84 (4 files) |
| `fixtures/` | 74 / 69 (1 file) | — (no equivalent) |
| **Total** | **1506 / 1286** | **1880 / 1598** |

Selenium requires **25% more raw lines / 24% more SLOC** for identical
comparable coverage — stripping comments barely moves this number, because
(also measured, see below) both repos turn out to carry a similar
proportion of comment-only lines across this scope, not the lopsided gap
the two codebases' visibly different commenting *style* in individual
files (e.g. `BasePage.ts`, `driver.ts`) would suggest at a glance.

**Comment density, measured directly** (not assumed): Playwright
220/1506 lines are comment-only (15%); Selenium 282/1880 (15%). Checking
this mattered — the two repos' commenting conventions genuinely differ
per-file (Selenium's `utils/driver.ts` is 53% comment-only; Playwright's
equivalent files have none of that style at all) — but averaged across the
full comparable scope (12 specs + all Page Objects + utils), the two
suites turn out equally comment-dense overall. The confound was real to
check for and turned out not to be material to this particular number.

LOC is read live off disk, so Selenium's `utils/` total includes H6's
Firefox/GeckoDriver branch added to `driver.ts`, and both `utils/driver.ts`
and `pages/admin/AdminUsersPage.ts` also include the two H6 fix commits
described in that section below (a Firefox-preference download-dir setup,
and a redirect-race fix) — treated as genuine, current code volume rather
than frozen at an earlier snapshot, since both are now a permanent,
committed part of the suite.

**Reading this honestly**: `pages/` is where the largest single gap lives
(488 vs. 705 SLOC) — Selenium's Page Objects carry the driver-lifecycle and
explicit-wait boilerplate Playwright's fixtures and auto-waiting absorb
for free. `utils/` favors Playwright too (60 vs. 84 SLOC), because
Selenium needs driver-lifecycle/download-polling plumbing (`driver.ts`,
`downloads.ts`) with no Playwright counterpart at all — Playwright's
69-SLOC `fixtures/index.ts` (which has no Selenium counterpart either)
accounts for most of Playwright's own `utils/`+`fixtures/` total instead.

**Verdict**: **Supported** — Selenium needs materially more code (~24%
SLOC, comments excluded) for the identical 42-test comparable scope,
concentrated specifically in the Page Object layer. The gap is essentially
unchanged whether or not comments are counted, which is itself worth
stating plainly rather than leaving as an unchecked assumption.

---

## H6 — Cross-Browser Extension Effort

> Extending an E2E suite to an additional browser engine requires less additional effort in Playwright than in Selenium WebDriver.

**Method**: added Firefox support to both suites for real (not simulated),
then ran the same 12 comparable specs against it. Playwright:
`playwright.config.ts` gained 5 new projects (`public-firefox`,
`admin-firefox`, `professor-firefox`, `student-firefox`,
`shared-firefox`), each its Chrome counterpart with only `devices[...]`
swapped, reusing the existing `setup` project unchanged. Selenium:
`utils/driver.ts` gained a `BROWSER=firefox` branch using
`selenium-webdriver/firefox`'s `Options`/`Builder`, no test file changes.

**Line count, raw and SLOC** (each change classified with
`benchmark/lib/loc.js`, not just `git diff --stat`'s raw total — material
here because this suite's own comment-heavy explanatory style means a
chunk of "lines changed" on the Selenium side is prose, not logic):

| | Playwright (`playwright.config.ts`) | Selenium (`utils/driver.ts`) |
|---|---|---|
| Lines changed (raw) | 40 | 22 |
| — of which SLOC (comments excluded) | **29** | **9** |
| — of which comment-only | 11 | 13 |

This number favors Selenium either way it's counted — raw (22 vs. 40) or
SLOC (9 vs. 29) — but the *gap widens* once comments are excluded: 1.8x
by raw count, 3.2x by SLOC. Selenium's 22-line diff carried
proportionally more comment prose (13 of 22 lines) than Playwright's
40-line diff did (11 of 40), so stripping comments shrinks Selenium's
already-smaller number by more than it shrinks Playwright's — making
Selenium's functional change look even cheaper relative to Playwright's,
not more expensive. Neither framing turns out to be the one that matters
most for this hypothesis, though — see below.

**What actually happened when each suite ran against Firefox** (run
twice, container restarted fresh both times, to check reproducibility):

| | Playwright | Selenium (run 1) | Selenium (run 2, confirmation) |
|---|---|---|---|
| Result | **45/45 passed** | 36 passed, 4 failed, 2 never ran | 37 passed, 3 failed, 2 never ran |
| Duration | 41.6s | ~5m | ~4m |
| Test/support code changes needed | **0** | **See below — both root causes found and fixed** | |

Playwright passed both dimensions that matter — clean and reproducible.
Selenium's failures split into two genuinely different categories once
run twice:

1. **A structural incompatibility, 100% reproducible both runs**:
   `TypeError: driver.setDownloadPath is not a function` in the
   `beforeEach` hook of `tests/professor/grading.spec.ts` —
   `setDownloadPath()` is a Chromium DevTools Protocol wrapper with no
   Firefox equivalent in this version of `selenium-webdriver`. Even though
   it's a `beforeEach` (not a once-per-suite `before`), Mocha treats *any*
   failing hook as fatal for the remaining tests in that describe block —
   documented Mocha behavior, not specific to this suite — which is why
   the other 2 tests in `Professor grading` never ran at all in *either*
   run (36+4+2=42 and 37+3+2=42), not just the one whose own hook threw.
   (An earlier version of this section attributed the skip to the hook
   being a one-time `before`; the code was always `beforeEach` — the skip
   mechanism is Mocha's fatal-hook-failure behavior, corrected here.)
2. **Row-lookup timeouts, only one of which is actually intermittent**:
   run 1 failed on `creates a new user`, `edits an existing user`, and
   `can enroll in an available course`; run 2 failed on only the first
   two. `can enroll in an available course` (PHY201) is left as-is —
   genuinely flaky on Firefox, an independent echo of H2's larger finding
   that this suite's Chrome-tuned wait constants (`DEFAULT_TIMEOUT`, the
   CI sandbox flags, the headless-viewport fix from blocker #1) haven't
   been re-tuned for Firefox's own timing profile, exactly as flagged as a
   risk in `benchmark/h6-cross-browser/README.md` before this was run.
   `creates a new user` / `edits an existing user`, though, reproduced
   100% both runs — not flaky, a real bug (see fix below).

**Both root causes, found and fixed** (code review + Chrome-side
regression testing; see caveat on Firefox re-verification below):

1. **`setDownloadPath` crash** — Firefox has no runtime download-path API;
   its download directory is a *profile preference* that must be set
   before the browser launches, unlike Chrome's per-session DevTools call.
   Fixed by moving download-dir setup into `createDriver()`'s Firefox
   branch (`browser.download.folderList`/`browser.download.dir`/
   `browser.helperApps.neverAsk.saveToDisk` for `text/csv`, matching the
   app's actual `response.setContentType("text/csv")`), and gating the
   Chrome-only `setDownloadPath()` call in `utils/downloads.ts` behind
   `process.env.BROWSER !== 'firefox'`.
2. **The `creates a new user` / `edits an existing user` race** —
   `/admin/users/register` redirects to `/dashboard` on success;
   `AdminUsersPage.createUser()` was clicking submit and immediately
   calling `this.open()` (→ `/admin/users`) without waiting for that
   redirect to land. GeckoDriver's click-then-navigate completion timing
   differs from ChromeDriver's, so the second navigation could start
   before the first redirect resolved, leaving the browser stuck
   mid-navigation instead of on `/admin/users` — the new row was never
   actually there to find. Chrome never hit this because ChromeDriver's
   navigation-tracking happened to always resolve the first redirect
   first; it's a real race either way, just one Chrome's timing never
   exposed. Fixed by waiting for `/dashboard` to actually load
   (`waitForUrlContains('/dashboard')`) before navigating away again.
   `edits an existing user` failed for the same underlying reason — it
   calls `createUser()` to set up its own fixture user first.

**Fix size**: 28 raw lines changed across `utils/driver.ts`,
`utils/downloads.ts`, `pages/admin/AdminUsersPage.ts` — **9 SLOC, 19
comment-only** (explaining *why*, matching this suite's existing
convention). The actual functional fix was small; most of the diff is the
same kind of rationale-comment overhead already visible in the original
H6 branch above.

**Verification status — read before citing pass/fail numbers above as
current**: both fixes were confirmed by re-running the affected specs on
**Chrome** (41/42 passing; `creates a new user`, `edits an existing user`,
and all 3 `Professor grading` tests including the CSV export now pass;
the one unrelated failure was a pre-existing stale-container data
collision in `admin/schedule.spec.ts`, not caused by this change — this
suite's own documented fix is to restart the container). Firefox itself
is not installed on the machine this fix was made on, so the two-run
Firefox reproduction that produced the Result/Duration numbers above has
**not** been redone against the fixed code — those two columns are the
original, pre-fix data, kept as the historical record of what was found.
Before citing an updated Selenium Firefox pass rate in the thesis, re-run
`BROWSER=firefox HEADLESS=true npm test` twice (fresh container restart
each time, matching the original method) and replace those two columns.

**Reading all of this together honestly**: line count, in either framing,
measures "effort to make the browser launch," and Selenium wins that
framing regardless of how the lines are counted — the SLOC correction
just makes Selenium's initial launch cost look even smaller relative to
Playwright's, not larger. But launching was never the bar this hypothesis
actually cares about — reaching the *same passing coverage, reproducibly*,
is. Playwright's config change reached that bar immediately, twice, with
no follow-up engineering. Selenium's smaller functional diff got Firefox
running, but needed a second, separate round of real debugging — a
structural gap and a genuine race condition, both now fixed — to even
approach parity, and one intermittent timing issue that echoes H2 rather
than gets "fixed" away. That total two-phase effort (get it running, then
debug it to parity) is the fairer effort comparison than either
line-count framing alone, and it's the basis the verdict below actually
rests on.

**Verdict**: **Supported**, but on the basis of *effort to reach parity*
— now including the actual debugging effort required, not just the
initial line count in either direction — rather than on how many lines
either change touched.

---

## Summary table

| Hypothesis | Verdict |
|---|---|
| H1 — Execution Speed Advantage | **Supported** (~9.9x faster, n=15, complete separation between groups, p<0.0001) |
| H2 — Test Stability Under Repetition | **Strongly supported** (73.3% of Selenium runs failed vs. 0% for Playwright, retries on for both; dedicated retries-off script would sharpen the exact number) |
| H3 — Initial Setup Overhead | **Supported** (dependency count, 3 vs. 10); config-LOC caveat noted (98 vs. 23 SLOC) |
| H4 — Locator Resilience and Maintainability | **Supported** |
| H5 — Code Volume and Expressiveness | **Supported** (24% more SLOC for Selenium; comment density measured equal, so the gap isn't a documentation-style artifact) |
| H6 — Cross-Browser Extension Effort | **Supported**, on effort-to-parity (Playwright 45/45 first try, 0 follow-up code; Selenium's smaller initial diff still needed a second debugging round — two structural bugs found and fixed post-hoc — to approach the same coverage; see writeup for fix size and the Firefox re-verification caveat) |
