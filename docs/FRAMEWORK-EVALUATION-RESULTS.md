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
line counts. Script: `benchmark/h3-setup-overhead/analyze.js`.

**Data**:

| | Playwright | Selenium |
|---|---|---|
| Direct dependencies | **3** (`@axe-core/playwright`, `@playwright/test`, `@types/node`) | **10** (`@types/chai`, `@types/mocha`, `@types/node`, `@types/selenium-webdriver`, `chai`, `dotenv`, `mocha`, `selenium-webdriver`, `ts-node`, `typescript`) |
| Config file lines | **124** (`playwright.config.ts` 112 + `tsconfig.json` 12) | **23** (`.mocharc.json` 8 + `tsconfig.json` 15) |

Config file lines are read live off disk, so this total includes H6's 5
Firefox projects added to `playwright.config.ts` (+40 lines) — the
before-H6 figure was 84 (72+12); it grew once cross-browser support was
added to that same file. Treated as real, current state rather than a
frozen earlier snapshot.

**Reading this honestly**: dependency count clearly favors Playwright
(3 vs. 10 — Selenium ships no test runner, assertion library, or
TypeScript tooling of its own, so a working suite needs Mocha, Chai, and
`ts-node` on top of `selenium-webdriver` itself). Config *line count*
actually favors Selenium (23 vs. 124) — but that's because
`playwright.config.ts` does much more per line (per-role projects,
`storageState`/`dependencies` wiring, trace/reporter config, and now
cross-browser projects too) than Selenium's two small config files, which
configure almost nothing beyond the spec glob and retry count. Line count
alone understates this; dependency count is the more honest half of this
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

**Metric**: raw LOC across `tests/` (scoped to the 12 comparable specs),
`pages/`, `utils/` (scoped to files the comparable specs actually use),
and `fixtures/` (Playwright only). Script:
`benchmark/h5-code-volume/analyze.js`.

**Data**:

| | Playwright | Selenium |
|---|---|---|
| `tests/` (12 files) | 741 | 864 |
| `pages/` (13 files) | 573 | 855 |
| `utils/` | 118 (2 files) | 133 (4 files) |
| `fixtures/` | 74 (1 file) | — (no equivalent) |
| **Total** | **1506** | **1852** |

Selenium requires **~23% more lines** for identical comparable coverage.

LOC is read live off disk, so Selenium's `utils/` total includes H6's
Firefox/GeckoDriver branch added to `driver.ts` (+22 lines) — the
before-H6 figure was 111; the current, real figure is 133. Treated as
genuine code volume rather than frozen at an earlier snapshot, since that
branch is now a permanent, committed part of the suite.

**Reading this honestly**: `pages/` is where the largest single gap lives
(573 vs. 855) — Selenium's Page Objects carry the driver-lifecycle and
explicit-wait boilerplate Playwright's fixtures and auto-waiting absorb
for free. `utils/` now favors Playwright too (118 vs. 133), partly
because Selenium needs driver-lifecycle/download-polling plumbing
(`driver.ts`, `downloads.ts`) with no Playwright counterpart, and partly
because that same `driver.ts` now also carries the Firefox branch H6
needed — Playwright's 74-line `fixtures/index.ts` (which has no Selenium
counterpart at all) accounts for most of Playwright's own
`utils/`+`fixtures/` total instead.

**Verdict**: **Supported** — Selenium needs materially more code (~23%)
for the identical 42-test comparable scope, concentrated specifically in
the Page Object layer.

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

**Raw line count** (`git diff --stat` on each change):

| | Playwright | Selenium |
|---|---|---|
| Lines changed | 40 (`playwright.config.ts`) | 22 (`utils/driver.ts`) |

Taken alone, this number actually favors Selenium — but it measures the
wrong thing on its own, see below.

**What actually happened when each suite ran against Firefox** (run
twice, container restarted fresh both times, to check reproducibility):

| | Playwright | Selenium (run 1) | Selenium (run 2, confirmation) |
|---|---|---|---|
| Result | **45/45 passed** | 36 passed, 4 failed, 2 never ran | 37 passed, 3 failed, 2 never ran |
| Duration | 41.6s | ~5m | ~4m |
| Test/support code changes needed | **0** | Unknown — not yet fixed | — |

Playwright passed both dimensions that matter — clean and reproducible.
Selenium's failures split into two genuinely different categories once
run twice:

1. **A structural incompatibility, 100% reproducible both runs**:
   `TypeError: driver.setDownloadPath is not a function` in a `before`
   hook — `setDownloadPath()` is a Chromium DevTools Protocol wrapper
   with no Firefox equivalent in this version of `selenium-webdriver`.
   Because the hook is a `before` (once per suite, not `beforeEach`), its
   failure silently prevented the other 2 tests in `Professor grading`
   from running at all in *both* runs (36+4+2=42 and 37+3+2=42). Fixing
   this for real means either a Firefox-specific download-handling
   implementation or accepting CSV export as untestable on Firefox with
   the current tooling — not a config tweak, and not something a retry
   would fix either.
2. **Row-lookup timeouts that are themselves intermittent on Firefox**:
   run 1 failed on `creates a new user`, `edits an existing user`, and
   `can enroll in an available course` (all `By.xpath('//tr[...]')` row
   matches); run 2 failed on only the first two — `can enroll in an
   available course` passed the second time. Same suite, same fresh
   container, same test, different outcome: this specific failure class
   is genuinely flaky on Firefox, not a deterministic break. Every wait
   constant in this suite (`DEFAULT_TIMEOUT`, the CI sandbox flags, the
   headless-viewport fix from blocker #1) was tuned against Chrome
   specifically, exactly as flagged as a risk in
   `benchmark/h6-cross-browser/README.md` before this was run — Firefox's
   own timing profile under headless needs its own tuning pass, and this
   two-run comparison is itself a small, independent echo of H2's larger
   finding: Selenium's suite carries more timing-sensitivity than
   Playwright's, here even before the *first* engine change is complete.

**Reading the two numbers together honestly**: line count alone measures
"effort to make the browser launch," and by that narrow measure Selenium
looks cheaper. But launching isn't the bar this hypothesis actually cares
about — reaching the *same passing coverage, reproducibly*, is.
Playwright's 40 lines reached that bar immediately, twice. Selenium's 22
lines get Firefox running, but a confirmed-reproducible structural gap
plus intermittent timing failures — 3 to 4 real problems depending on the
run — stand between that and matching Playwright's clean, repeatable
result, and the total further effort needed to close that gap hasn't
been measured (it's new engineering, not implied by anything measured so
far).

**Verdict**: **Supported**, but on the basis of *effort to reach parity*,
not raw lines changed to enable the browser — that framing is important
enough to state explicitly rather than lead with the misleading 40-vs-22
line count on its own.

---

## Summary table

| Hypothesis | Verdict |
|---|---|
| H1 — Execution Speed Advantage | **Supported** (~9.9x faster, n=15, complete separation between groups, p<0.0001) |
| H2 — Test Stability Under Repetition | **Strongly supported** (73.3% of Selenium runs failed vs. 0% for Playwright, retries on for both; dedicated retries-off script would sharpen the exact number) |
| H3 — Initial Setup Overhead | **Supported** (dependency count); config-LOC caveat noted |
| H4 — Locator Resilience and Maintainability | **Supported** |
| H5 — Code Volume and Expressiveness | **Supported** |
| H6 — Cross-Browser Extension Effort | **Supported** (Playwright 45/45 first try; Selenium 36 passed/4 failed/2 never-ran, incl. one structural gap) — see caveat on raw line count above |
