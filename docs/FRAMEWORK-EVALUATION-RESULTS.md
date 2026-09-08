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
spec files (45 tests: 42 comparable tests + 3 `[setup]` project runs, see
note below), container restarted before every run, N repeated runs,
alternating order. Script: `benchmark/h1-execution-speed/run.js`.

**Data** (15 rounds / 15 runs per framework, `benchmark/h1-execution-speed/summary.json`, 2026-09-08):

| | Playwright | Selenium |
|---|---|---|
| n | 15 | 15 |
| Mean | **33.3s** | **322.2s** |
| Median | 32.8s | 316.1s |
| Stdev | 1.4s | 58.6s |
| Min | 31.4s | 217.4s |
| Max | 35.3s | 486.9s |
| Non-zero-exit runs | 0/15 | **10/15** |

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

Playwright is **~9.7x faster on average**. The two ranges still don't
overlap at all even at the full n=15 — Playwright's single slowest run
(35.3s) is still faster than Selenium's single fastest run (217.4s).
Complete separation between two groups of 15 is decisively significant
under a Mann-Whitney U test (U=225, the maximum possible value, p<0.0001).

Playwright's own 15 durations are also tight and consistent (31.4–35.3s,
stdev 1.4s). Selenium's spread is much wider (217.4–486.9s, stdev
58.6s) — itself a second, independent finding: Selenium's execution time
is far less predictable run-to-run, not just slower on average.

Both suites were measured single-worker: `playwright.config.ts` sets
`workers: process.env.CI ? 1 : undefined`, and this script sets `CI=true`
for both frameworks (`benchmark/h1-execution-speed/run.js`), so there is
no parallelism asymmetry in this number — Selenium's own Mocha run is
also strictly sequential. The gap instead comes from architectural
differences specific to this comparison: Playwright authenticates 3 times
total via `storageState` reuse against Selenium launching a fresh browser
process in nearly every one of its 42 tests' own `beforeEach`, and
Selenium's own run-level failures (see H2) bake retry-timeout overhead
into its mean.

**Verdict**: **Supported**, with high confidence — full n=15 collected,
complete separation between groups. ~9.7x is the number to cite.

**Note**: measured using each suite's own normal configuration (Selenium's
`retries: 2` still active, not forced to 0) — see H2 below for what that
revealed as a side effect of measuring H1.

---

## H2 — Test Stability Under Repetition

> Selenium-based E2E tests are more prone to intermittent failures (flakiness) than Playwright-based tests of equivalent scope.

**Metric**: both suites run N times, container restarted before every
run, first-attempt pass/fail aggregated per run. Derived from the same
15-round H1 timing data above (each suite's own normal configuration —
Selenium's `retries: 2` still active, not forced to 0 — see
`benchmark/h2-test-stability/run.js` for a dedicated retries-disabled
script that would sharpen the exact first-attempt-only per-test rate, not
yet run at full N).

**Data**:

| | Playwright | Selenium |
|---|---|---|
| Runs | 15 | 15 |
| Runs with ≥1 failure | **0 (0%)** | **10 (66.7%)** |
| Total individual test failures | 0 | **15** |
| Exit codes across all 15 runs | all `0` | `1,2,0,4,0,1,1,1,1,0,2,0,1,1,0` |

15 individual test failures across 630 test executions (42 tests × 15
runs) is a ~2.4% per-test failure rate for Selenium — small per test, but
it compounds at the run level: with 42 tests each carrying some chance of
a spurious timeout, **66.7% of full-suite runs hit at least one failure**,
even with Mocha's own `retries: 2` already trying to absorb it. Counted
directly from every run log: **all 15 failures are the same shape** —
`TimeoutError`, an element-located wait timing out at 20s (this suite's
`DEFAULT_TIMEOUT`) — spread across many different tests and Page Objects
(admin courses, admin users, admin content, professor grading, professor
course list/content, student enrollment, student permissions), not
concentrated in one bad test. This is a systemic issue consistent with
tail-latency variance from launching many sequential Chrome processes,
severe enough that 2 retries don't always absorb it.

Every one of the 15 Playwright runs passed cleanly — 0 failures, 0/15
runs affected.

**Verdict**: **Strongly supported**. A 66.7% run-level failure rate
against 0% is not a subtle effect — the dedicated retries-disabled script
would still sharpen the exact first-attempt failure rate per test for a
more precise number, but the practical conclusion is already unambiguous.

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

Selenium's two config files are plain JSON — no comment syntax exists for
them to carry, so their raw and SLOC figures are identical by
construction, not because they're equally information-dense.

**Reading this honestly**: dependency count clearly favors Playwright
(3 vs. 10 — Selenium ships no test runner, assertion library, or
TypeScript tooling of its own, so a working suite needs Mocha, Chai, and
`ts-node` on top of `selenium-webdriver` itself). Config *line count*
still favors Selenium either way it's counted (23 vs. 124 raw, 23 vs. 98
SLOC) — but that's because `playwright.config.ts` does much more per line
(per-role projects, `storageState`/`dependencies` wiring, trace/reporter
config, and cross-browser projects) than Selenium's two small config
files, which configure almost nothing beyond the spec glob and retry
count. Stripping comments narrows the gap from 5.4x to 4.3x but doesn't
close it — line count alone still understates what `playwright.config.ts`
is actually doing; dependency count is the more honest half of this
metric.

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
rationale-explaining comment blocks throughout), so raw LOC alone would
partly measure documentation style rather than framework verbosity.
Script: `benchmark/h5-code-volume/analyze.js`.

**Data** (2026-09-08):

| | Playwright (raw / SLOC) | Selenium (raw / SLOC) |
|---|---|---|
| `tests/` (12 files) | 741 / 669 | 864 / 809 |
| `pages/` (13 files) | 573 / 488 | 882 / 707 |
| `utils/` | 118 / 60 (2 files) | 169 / 94 (4 files) |
| `fixtures/` | 74 / 69 (1 file) | — (no equivalent) |
| **Total** | **1506 / 1286** | **1915 / 1610** |

Selenium requires **27% more raw lines / 25% more SLOC** for identical
comparable coverage.

**Comment density, measured directly**: Playwright 220/1506 lines are
comment-only (15%); Selenium 305/1915 (16%) — the two suites are equally
comment-dense overall despite very different per-file commenting styles
(e.g. `utils/driver.ts` is comment-heavy; Playwright's equivalent files
carry almost none of that style), so the gap isn't a documentation-style
artifact.

**Reading this honestly**: `pages/` is where the largest single gap lives
(488 vs. 707 SLOC) — Selenium's Page Objects carry the driver-lifecycle
and explicit-wait boilerplate Playwright's fixtures and auto-waiting
absorb for free. `utils/` favors Playwright too (60 vs. 94 SLOC), because
Selenium needs driver-lifecycle/download-polling plumbing (`driver.ts`,
`downloads.ts`) with no Playwright counterpart at all — Playwright's
69-SLOC `fixtures/index.ts` (which has no Selenium counterpart either)
accounts for most of Playwright's own `utils/`+`fixtures/` total instead.

**Verdict**: **Supported** — Selenium needs materially more code (~25%
SLOC, comments excluded) for the identical 42-test comparable scope,
concentrated specifically in the Page Object layer.

---

## H6 — Cross-Browser Extension Effort

> Extending an E2E suite to an additional browser engine requires less additional effort in Playwright than in Selenium WebDriver.

**Method**: Firefox support added to both suites for real (not
simulated), then the same 12 comparable specs run against it. Playwright:
`playwright.config.ts` carries 5 Firefox-mirror projects (`public-firefox`,
`admin-firefox`, `professor-firefox`, `student-firefox`,
`shared-firefox`), each its Chrome counterpart with only `devices[...]`
swapped, reusing the existing `setup` project unchanged. Selenium:
`utils/driver.ts` carries a `BROWSER=firefox` branch using
`selenium-webdriver/firefox`'s `Options`/`Builder`, no test file changes
of its own.

**Line count, raw and SLOC** (classified with `benchmark/lib/loc.js`, not
just `git diff --stat`'s raw total):

| | Playwright (`playwright.config.ts`) | Selenium (`utils/driver.ts` + 2 Page Objects) |
|---|---|---|
| Total lines changed (raw) | 40 | 41 |
| — of which SLOC (comments excluded) | **29** | **21** |
| — of which comment-only | 11 | 20 |

Selenium's total includes fixing 4 distinct bugs surfaced only by
actually running the suite against Firefox: a Chromium-only
`setDownloadPath()` call with no Firefox equivalent, and three separate
instances of the same unguarded-redirect race (`AdminUsersPage.createUser()`,
`AdminUsersPage.editUser()`, `ProfessorCoursesPage.manageStudents()` all
clicked through a form/link without waiting for the resulting navigation
to actually land before returning control to the test). Each was
root-caused and fixed — waiting for a concrete post-navigation signal
(`waitForUrlContains(...)` or `until.stalenessOf(...)`) before returning.
Playwright's diff required no debugging: written once, no test or support
code changes needed at any point.

**What actually happens when each suite runs against Firefox** (run
twice, container restarted fresh both times, to check reproducibility;
`benchmark/h6-cross-browser/playwright-firefox-run.log` /
`selenium-firefox-run.log`, 2026-09-08):

| | Playwright | Selenium |
|---|---|---|
| Run 1 | **45/45 passed** (41.6s) | **42/42 passed** (~2m) |
| Run 2 | **45/45 passed** (38.6s) | **42/42 passed** (~3m) |

Both suites now pass cleanly and reproducibly on Firefox.

**Reading this honestly**: on this thesis's own quantitative metric —
SLOC, the same one H3 and H5 verdicts are based on — H6 is **not
supported**. Selenium's total diff (21 SLOC) is still smaller than
Playwright's (29 SLOC), even counting the code needed to fix all 4 bugs
found along the way. What favors Playwright is a different, qualitative
observation: reaching a clean, reproducible Firefox pass required zero
debugging on the Playwright side and four root-caused bug fixes on the
Selenium side — a real difference in engineering effort that this
thesis's LOC metric doesn't capture, since the smaller diff still hid
more work than it showed.

**Verdict**: **Mixed** — not supported on this thesis's own LOC metric
(Selenium needed less code, 21 vs. 29 SLOC); the case for Playwright
rests on the qualitative difference in effort needed to reach a working,
reliable state (zero fixes vs. four), which is a real finding but not the
same kind of quantitative evidence as H1–H5's verdicts.

---

## Summary table

| Hypothesis | Verdict |
|---|---|
| H1 — Execution Speed Advantage | **Supported** (~9.7x faster, n=15, complete separation between groups, p<0.0001) |
| H2 — Test Stability Under Repetition | **Strongly supported** (66.7% of Selenium runs failed vs. 0% for Playwright, retries on for both) |
| H3 — Initial Setup Overhead | **Supported** (dependency count, 3 vs. 10); config-LOC caveat noted (98 vs. 23 SLOC) |
| H4 — Locator Resilience and Maintainability | **Supported** |
| H5 — Code Volume and Expressiveness | **Supported** (25% more SLOC for Selenium; comment density measured equal, so the gap isn't a documentation-style artifact) |
| H6 — Cross-Browser Extension Effort | **Mixed** — not supported on SLOC (Selenium: 21 vs. Playwright's 29); Playwright's favor is that it needed zero debugging to reach a clean, reproducible Firefox pass, vs. four root-caused bug fixes on the Selenium side |
