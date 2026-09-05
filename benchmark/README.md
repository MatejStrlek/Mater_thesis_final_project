# Framework Evaluation Benchmarks

Empirical data for thesis Chapter 5 (Playwright vs. Selenium WebDriver),
organized one folder per hypothesis so each one's code and results are
self-contained. See [`docs/FRAMEWORK-EVALUATION.md`](../docs/FRAMEWORK-EVALUATION.md)
for the methodology and precondition (both suites at 12-spec/42-test
comparable scope), and [`docs/FRAMEWORK-EVALUATION-RESULTS.md`](../docs/FRAMEWORK-EVALUATION-RESULTS.md)
for the actual per-hypothesis comparison and verdicts once data exists.

All scripts here read the sibling `../Selenium-masters-thesis-code` repo
by relative path but never write to it — every raw result, log, and
summary lives in this repo only.

| Folder | Hypothesis | Script | Needs the app container? | Status |
|---|---|---|---|---|
| `h1-execution-speed/` | H1 — Execution Speed Advantage | `run.js [rounds]` | Yes — restarts it before every run | **Done** — n=15/15, ~9.9x, see results doc |
| `h2-test-stability/` | H2 — Test Stability Under Repetition | `run.js [runs]` | Yes — restarts it before every run | Verdict reached from H1's side-effect data (73.3% vs. 0% run failure rate); dedicated script built but not run at full N |
| `h3-setup-overhead/` | H3 — Initial Setup Overhead | `analyze.js` | No — static analysis only | **Done** |
| `h4-locator-resilience/` | H4 — Locator Resilience and Maintainability | `analyze.js` | No — static analysis only | **Done** |
| `h5-code-volume/` | H5 — Code Volume and Expressiveness | `analyze.js` | No — static analysis only | **Done** |
| `h6-cross-browser/` | H6 — Cross-Browser Extension Effort | manual — see its `README.md` | Yes | **Done** — see its `README.md` |

`lib/container.js` and `lib/comparable-specs.js` are shared by every
script that needs them (container restart/readiness, the 12-file
comparable spec list) — defined once so they can't drift out of sync
between H1 and H2's scripts.

## Running everything

```bash
# Static (fast, no app needed):
node benchmark/h3-setup-overhead/analyze.js
node benchmark/h4-locator-resilience/analyze.js
node benchmark/h5-code-volume/analyze.js

# Dynamic (slow — each restarts the app container repeatedly):
node benchmark/h1-execution-speed/run.js 15   # already run once (n=15/15, done) — re-run to extend the dataset
node benchmark/h2-test-stability/run.js 15    # optional — H2's verdict is already reached from H1's side-effect data
```

Run H1 and H2 one at a time, never concurrently — both drive real
browsers against the same shared app container, and running them
together would contaminate each other's timing/stability measurements.
