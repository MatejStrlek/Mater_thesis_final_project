# Framework Evaluation — Planning Notes (Thesis Chapter 5)

Working notes for the thesis's empirical framework-comparison chapter
(Playwright vs. Selenium WebDriver), covering the same target application
(`uni_course_management`) from two sibling repos in this `Diplomski`
directory: this repo (Playwright) and `../Selenium-masters-thesis-code`
(Selenium). All six hypotheses have been measured — see
[`FRAMEWORK-EVALUATION-RESULTS.md`](FRAMEWORK-EVALUATION-RESULTS.md) for
the actual per-hypothesis data and verdicts. This file is the design
record: the methodology and the metrics behind that data. Maps onto the
thesis TOC's Chapter 5: 5.1 (metrics + hypotheses, this file), 5.2
(methodology, also here), 5.3 (final analysis and discussion, in the
results doc).

## Precondition

Both suites are at **full E2E parity**: 42 tests across **12** spec files
each (verified directly against both repos' real `tests/` trees — both
READMEs' own claim of "15 files" turned out to be stale), covering the
identical set of real admin/professor/student/shared/public flows against
the same app and seeded data. Visual regression, network-mocking, and
pure API tests are deliberately excluded from the comparison on both
sides — neither framework differentiates on them, so including them
wouldn't measure anything. This parity is what makes a fair comparison
possible; without it, none of the metrics below would be comparing like
with like. The exact 12-file list is centralized in
`benchmark/lib/comparable-specs.js`.

**All benchmark code and all results live in this repo only** — see
[`benchmark/`](../benchmark/), organized one folder per hypothesis
(`h1-execution-speed/`, `h2-test-stability/`, etc., see
`benchmark/README.md`). Nothing is written to the sibling Selenium repo;
its scripts there are read (by relative path) but never modified.

## Methodology

- **Same machine, same target app container, alternating run order.**
  Restart `uni-course-management` to a clean H2 state before switching
  frameworks; interleave runs (Playwright, Selenium, Playwright, …)
  rather than all-of-one-then-all-of-other, to cancel out machine
  warm-up/thermal drift as a confound.
- **Pin the app image.** Both repos currently pull `:latest` — pin a
  digest for the duration of data collection so the target app can't
  change mid-experiment and silently invalidate a comparison. *In
  practice*: not pinned by digest for real, but verified after the fact
  (`docker inspect`) that the running container's image digest matched
  `:latest` throughout — the image was never re-pulled during data
  collection, only restarted, so it was stable in effect even though not
  pinned by the letter of this rule.
- **Repeat enough to say something statistically.** N=10–20 runs per
  suite minimum. Report mean, median, and standard deviation, not a
  single run. Use a non-parametric test (Mann-Whitney U) rather than
  eyeballing a difference, since execution-time distributions are
  typically right-skewed (occasional slow launches, not symmetric
  noise).
- **Pre-register acceptance thresholds before collecting data.** E.g.
  "H1 accepted if Playwright's mean is ≥X% lower, p<0.05." Otherwise the
  narrative gets fitted to the numbers after the fact, which isn't
  proof of anything. *In practice*: no numeric threshold was written down
  in advance for any hypothesis — worth naming as a real limitation of
  this run, though every verdict reached ended up resting on effects
  large enough (complete separation for H1, 73.3% vs. 0% for H2, >3x gaps
  for H3–H5, reproducible pass/fail gaps for H6) that no plausible
  pre-registered threshold would have changed the outcome.

## Metrics

| # | Metric | Hypothesis | Script | Status |
|---|---|---|---|---|
| M1 | Execution time (wall-clock) | H1 | `benchmark/h1-execution-speed/run.js` | **Done** — n=15/15, ~9.9x, see `docs/FRAMEWORK-EVALUATION-RESULTS.md` |
| M2 | Stability / flake rate | H2 | `benchmark/h2-test-stability/run.js` | **Done** — verdict reached from H1's side-effect data (73.3% vs. 0% run-failure rate); dedicated retries-off script built but not run at full N |
| M3 | Setup complexity / learning curve | H3 | `benchmark/h3-setup-overhead/analyze.js` | **Done** — see `docs/FRAMEWORK-EVALUATION-RESULTS.md` |
| M4 | Locator resilience | H4 | `benchmark/h4-locator-resilience/analyze.js` | **Done** — see `docs/FRAMEWORK-EVALUATION-RESULTS.md` |
| M5 | Code volume for equal coverage | H5 | `benchmark/h5-code-volume/analyze.js` | **Done** — see `docs/FRAMEWORK-EVALUATION-RESULTS.md` |
| M6 | Cross-browser portability | H6 | `benchmark/h6-cross-browser/` | **Done** — confirmed with a second run, see `docs/FRAMEWORK-EVALUATION-RESULTS.md` |
| M7 | Defect/blocker resolution during development | optional 7th | none — read directly from both repos' READMEs | Not written up yet, but needs no new tooling |

M7 is writable today with zero additional infrastructure — both repos
already contain a real, itemized incident log (click-interception
workaround, time-input gotcha, CSV download plumbing, DOM-scoping bug,
retry/flake handling, first-launch latency, etc.).

## Hypotheses

**H1 — Execution Speed Advantage**
Playwright executes an equivalent-scope E2E suite faster than Selenium
WebDriver.

**H2 — Test Stability Under Repetition**
Selenium-based E2E tests are more prone to intermittent failures
(flakiness) than Playwright-based tests of equivalent scope.

**H3 — Initial Setup Overhead**
Playwright requires less initial setup effort (dependencies,
configuration, boilerplate) to reach a first working test than Selenium
WebDriver.

**H4 — Locator Resilience and Maintainability**
Playwright test suites rely more heavily on resilient, user-facing
locators than Selenium suites, which favor lower-level selectors.

**H5 — Code Volume and Expressiveness**
Playwright suites require less code to express equivalent test coverage
than Selenium suites.

**H6 — Cross-Browser Extension Effort**
Extending an E2E suite to an additional browser engine requires less
additional effort in Playwright than in Selenium WebDriver.

*(Optional 7th, free to add since M7 needs no new work: development-time
blockers were resolved via framework-native tooling more often in
Playwright and via manual workarounds more often in Selenium.)*
