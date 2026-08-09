# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

This repo has two purposes, in sequence:

1. **Final project specification** (done, locked): [`docs/PROJECT-SPECIFICATION.md`](docs/PROJECT-SPECIFICATION.md) is the assignment document handed to students of the *End-to-End Test Automation with Playwright* course, after they complete the companion 15-week Playwright lab course (a separate sibling repo, `../Playwright-masters-thesis-code`). It's transcribed from `Final_Project_Specification.docx` (the actual distributable file students receive, lives outside this repo — not committed here, since the Markdown copy already has the full content). **The source `.docx` is the ground truth if the two ever diverge** — re-sync this Markdown copy from it, don't edit the rubric independently here.

   Shape of the spec: 100 points across **6 outcome pairs** (minimum outcome / desired outcome each), ≈17 pts per pair (17/17/17/17/16/16), each pair split into a minimum-requirements checklist (worth 50 pts total across all 6) and a desired-requirements checklist (the other 50 pts). Students pick their own prior Algebra-course web app as the application under test — **or** fall back to the spec's own named reference project, `uni_course_management` (see below).

2. **Reference implementation** (next phase): this repo becomes the instructor's own worked example of that same spec, built against **`https://github.com/MatejStrlek/uni_course_management`** (*Rapid Development of Java Applications Using Frameworks*) — which the spec itself names as "Option B — the reference project" (`docs/PROJECT-SPECIFICATION.md` §2). Building the full reference solution against exactly that project doubles as: (a) the master's thesis's practical deliverable, proving the spec is buildable end-to-end, and (b) the actual answer key backing the spec's own fallback option. Must satisfy every minimum + desired requirement in the rubric, not just a subset.

`docs/THEORY.md` is copied verbatim from the sibling labs repo — the concept reference every spec requirement traces back to. `playwright.config.ts` and `tests/` are still the generic scaffold from step 1; they'll be pointed at `uni_course_management` once phase 2 starts (a `baseURL`/`webServer` and real fixtures don't exist yet).

## Commands

```bash
npx playwright test                       # run all tests headless (all 3 browsers)
npx playwright test tests/example.spec.ts # run a single file
npx playwright test -g "get started link" # run tests matching a title
npx playwright test --project=chromium    # run against one browser only
npx playwright test --ui                  # interactive UI mode
npx playwright test --debug               # step-through debugger
npx playwright codegen <url>               # record a new test by clicking through the site
npx playwright show-report                # open the last HTML report
```

`npm test` is aliased to `playwright test`.

## Architecture

- `playwright.config.ts` — single source of config: `testDir: ./tests`, three browser projects (chromium, firefox, webkit), HTML reporter, trace captured `on-first-retry`. No `baseURL` or `webServer` set yet — add one when a target app exists, so tests can use relative `page.goto('/')`.
- `tests/` — the actual test suite (`testDir`), the only directory Playwright runs by default.
- `tests-examples/` — reference-only sample spec (todo app demo). Not under `testDir`, so it does not run as part of `npx playwright test`; kept as a pattern reference.
- `.github/workflows/playwright.yml` — CI: `npm ci` → `npx playwright install --with-deps` → `npx playwright test`, uploads the HTML report as an artifact. Triggers on push/PR to `main`/`master`.
- `docs/PROJECT-SPECIFICATION.md` / `docs/THEORY.md` — see "Project" above. Per the spec's own §5 (Submission Requirements), the reference implementation's written deliverables (testing-strategy section, architecture note, debugging walkthrough, CI trade-off analysis, coverage plan, suite-health note) belong as **sections within the top-level `README.md`**, not separate `docs/` files — that's a deliberate change from this repo's earlier (pre-.docx) draft spec, don't reintroduce standalone `TESTING-STRATEGY.md`-style files.

## Environment gotcha

This machine's user-level `.npmrc` sets `allow-scripts` to only allow `@anthropic-ai/claude-code`, which blocks lifecycle (install/postinstall) scripts for other packages during `npm install`. When adding new npm dependencies, use `npm install --ignore-scripts <pkg>`. This does not affect CI (GitHub-hosted runners use their own npm config). Playwright browser binaries are a separate explicit step and are unaffected: `npx playwright install`.
