# END-TO-END TEST AUTOMATION WITH PLAYWRIGHT

## Final Project Specification

### Building a Production-Grade Playwright Test Suite for an Existing Application

*Grading scale: 100 points · Minimum outcomes = 50 points · Desired outcomes = 100 points*

> This is the authoritative copy of the final project specification in
> this repo, transcribed from the original `Final_Project_Specification.docx`
> handed to students (that file itself isn't kept here). If the source
> `.docx` is revised, re-sync this file from it.

## 1. Overview

This document specifies the final project for the *End-to-End Test
Automation with Playwright* course. The project asks you to design and
implement a real, non-trivial Playwright test suite against an
application you already built — not to build a new application. Every
requirement below maps directly to the 15-week course (lectures, labs,
and the theory reference).

The project is your opportunity to demonstrate, on a real codebase,
everything the course covered: independent and deterministic E2E tests,
a maintainable suite architecture, testing under realistic conditions
(auth, network, environment), diagnosing failures, and running the suite
in a CI pipeline — plus, for full marks, the more advanced material:
data-driven tests, visual regression and accessibility testing,
flaky-test triage, and CI execution strategy.

### 1.1 Learning outcomes covered

This project is the primary assessment instrument for the course's six
learning-outcome pairs (minimum / desired):

| # | Minimum outcome (50%) | Desired outcome (100%) | Points |
|---|---|---|---|
| 1 | Explain how end-to-end testing fits into quality assurance, and how it differs from unit and integration testing. | Justify how test coverage for a given application should be divided between unit, component, API and end-to-end tests. | 17 |
| 2 | Write end-to-end tests that are independent and deterministic, using user-facing locators and web-first assertions. | Write data-driven and reusable tests that stay readable as the number of covered scenarios grows. | 17 |
| 3 | Structure a growing test suite using hooks, custom fixtures and the Page Object Model. | Design the architecture of a test suite for a real application and critically evaluate the structure of an existing one. | 17 |
| 4 | Test an application under realistic conditions, using network interception, saved authentication state and environment configuration. | Extend a suite beyond functional checks with visual regression and accessibility testing, and judge their trade-offs. | 17 |
| 5 | Diagnose a failing test using the HTML report and the trace viewer. | Diagnose flaky tests, separating real defects from race conditions in the test code, and apply a triage and quarantine strategy. | 16 |
| 6 | Run an automated test suite inside a continuous integration pipeline. | Weigh the trade-offs between parallel execution, sharding, and retries, and propose a suitable execution pipeline. | 16 |
| | | **Total** | **100** |

## 2. Base Application

You will not build a new application for this project. Instead, choose
an existing web application you already built as part of an earlier
course (any of the Algebra-track courses, any technology or framework)
to act as the application under test.

- **Option A — your own project:** reuse a web application you built in
  a previous course. It can be built with any stack (Java/Spring, .NET,
  Node, PHP, plain JS — anything with a browser-facing UI and, ideally,
  a backend you can reach with HTTP requests).
- **Option B — the reference project:** `uni_course_management` (*Rapid
  Development of Java Applications Using Frameworks*). Use this if you
  don't have a suitable earlier project.

The application under test does not need any modification to be
"testable" beyond what is reasonable to ask (e.g. adding `data-testid`
attributes where no accessible role/label exists is fine and expected —
it is not a rewrite of the application). If the application has no
seed/test data, you are responsible for seeding or scripting the data
your suite depends on.

State your chosen base application, its repository link, and its tech
stack at the top of your submission README.

## 3. Grading Model

The project is worth 100 points, split evenly across the six outcome
pairs (≈17 points each). Within each area, the points are further split
between the minimum outcome requirements (worth 50 points overall) and
the desired outcome requirements (worth the remaining 50 points). You do
not need to attempt the desired-outcome requirements to pass —
completing only the minimum requirements across all six areas yields
exactly 50/100.

| No. | Focus | Minimum pts | Desired pts | Outcome total |
|---|---|---|---|---|
| 1 | E2E Testing Strategy & QA Context | 8 | 9 | 17 |
| 2 | Deterministic Tests, Locators & Assertions + Data-Driven Suites | 9 | 8 | 17 |
| 3 | Suite Structure: Hooks, Fixtures, POM & Architecture | 8 | 9 | 17 |
| 4 | Realistic Conditions (Network, Auth, Environment) + Visual & Accessibility Testing | 9 | 8 | 17 |
| 5 | Diagnosing Failures & Suite Health | 8 | 8 | 16 |
| 6 | Continuous Integration & Execution Strategy | 8 | 8 | 16 |
| | **Total** | **50** | **50** | **100** |

50 points → passing grade, all six minimum outcomes demonstrated. 100
points → all six minimum and all six desired outcomes demonstrated.
Partial credit is awarded per requirement, not all-or-nothing per area.

## 4. Detailed Requirements

Each area below lists its minimum-outcome requirements (required for the
base 50%) and its desired-outcome requirements (for the remaining marks
toward 100%). Point values are shown per requirement.

### Outcome 1 — E2E Testing Strategy & QA Context (17 pts)

Minimum outcome: Explain how end-to-end testing fits into quality
assurance, and how it differs from unit and integration testing.
Desired outcome: Justify how test coverage for a given application
should be divided between unit, component, API and end-to-end tests.

#### Minimum requirements — 8 pts

- A README `Testing Strategy` section (300–500 words) explaining what
  role E2E testing plays in the quality assurance of the chosen
  application, and how it differs from unit and integration testing for
  that specific app. **[5 pts]**
- A project README describing the application under test, its tech
  stack, how to install dependencies, and how to run the suite locally.
  **[3 pts]**

#### Desired requirements — 9 pts

- A test-coverage plan: a table mapping the application's main
  features/pages to a test type (unit / component / API / E2E), each
  with a one-sentence justification for that choice. **[6 pts]**
- At least 2 API-level tests written with Playwright's `request`
  fixture, exercising backend endpoints directly (no browser),
  referenced in the coverage plan as the API-level slice of coverage.
  **[3 pts]**

### Outcome 2 — Deterministic Tests, Locators & Assertions + Data-Driven Suites (17 pts)

Minimum outcome: Write end-to-end tests that are independent and
deterministic, using user-facing locators and web-first assertions.
Desired outcome: Write data-driven and reusable tests that stay
readable as the number of covered scenarios grows.

#### Minimum requirements — 9 pts

- At least 15 E2E test cases covering the application's core user
  flows. Every test must be independent — no shared mutable state
  between tests, and the suite must pass when run fully in parallel or
  in any order. **[4 pts]**
- Every test uses user-facing locators (`getByRole`, `getByLabel`,
  `getByText`, `getByTestId`). Raw CSS/XPath selectors are only
  acceptable with a code comment justifying why no user-facing locator
  was available. **[3 pts]**
- Every assertion is a web-first (polling) assertion (`toBeVisible()`,
  `toHaveText()`, etc.). No `page.waitForTimeout()` or other
  fixed/hard waits anywhere in the suite. **[2 pts]**

#### Desired requirements — 8 pts

- At least one data-driven test suite generated from an array/table of
  at least 5 input variations, where each variation appears as its own
  named test in the HTML report (not one test looping silently).
  **[4 pts]**
- At least 3 tests refactored to remove duplication via shared, reusable
  helper functions or parameterization, without sacrificing readability
  of the test body. **[4 pts]**

### Outcome 3 — Suite Structure: Hooks, Fixtures, POM & Architecture (17 pts)

Minimum outcome: Structure a growing test suite using hooks, custom
fixtures and the Page Object Model.
Desired outcome: Design the architecture of a test suite for a real
application and critically evaluate the structure of an existing one.

#### Minimum requirements — 8 pts

- Tests organized with `test.describe()` blocks and the appropriate
  hooks (`beforeEach`/`afterEach`, and `beforeAll`/`afterAll` where
  genuinely needed). **[2 pts]**
- At least one custom fixture built with `base.extend()`, composing on
  top of Playwright's built-in fixtures. **[3 pts]**
- A Page Object Model implemented for at least 3 pages/components of the
  application under test, and used consistently by the tests (no raw
  locators duplicated outside the Page Objects for those pages).
  **[3 pts]**

#### Desired requirements — 9 pts

- A written architecture note (with a simple diagram) explaining the
  suite's folder structure, how fixtures compose (e.g. a login fixture
  built on a base fixture), and how Page Objects are layered. **[4 pts]**
- A critical evaluation section: identify one real structural weakness —
  either in the base application's own testability, or in an
  earlier/naive version of the test suite — and explain concretely how
  the final structure addresses it. **[3 pts]**
- `test.step()` used to structure at least 5 non-trivial tests, so their
  HTML report entries are readable step-by-step. **[2 pts]**

### Outcome 4 — Realistic Conditions (Network, Auth, Environment) + Visual & Accessibility Testing (17 pts)

Minimum outcome: Test an application under realistic conditions, using
network interception, saved authentication state and environment
configuration.
Desired outcome: Extend a suite beyond functional checks with visual
regression and accessibility testing, and judge their trade-offs.

#### Minimum requirements — 9 pts

- Authentication handled through a setup project (`*.setup.ts`) that
  produces a `storageState`, reused via `dependencies` by the projects
  that need to already be logged in — no test re-does the login UI flow
  just to reach an authenticated page. **[3 pts]**
- At least 2 tests use `page.route()` to intercept and mock a network
  response (e.g. an error state or edge-case payload) that would be
  slow or difficult to provoke from the real backend. **[3 pts]**
- Multi-environment configuration: `baseURL` and any environment-specific
  values are read from environment variables / `playwright.config.ts`,
  not hardcoded inside test files. **[3 pts]**

#### Desired requirements — 8 pts

- Visual regression baselines (`toHaveScreenshot()`) for at least 3 key
  pages or components, with `mask` or animation-handling applied where
  the page has live-updating content. **[4 pts]**
- Accessibility scans (`axe-core` / `AxeBuilder`) on at least 3 pages,
  with findings documented (violations fixed, or explicitly accepted
  with reasoning), plus a short written judgment of what automated
  scanning does and does not guarantee about real accessibility.
  **[4 pts]**

### Outcome 5 — Diagnosing Failures & Suite Health (16 pts)

Minimum outcome: Diagnose a failing test using the HTML report and the
trace viewer.
Desired outcome: Diagnose flaky tests, separating real defects from
race conditions in the test code, and apply a triage and quarantine
strategy.

#### Minimum requirements — 8 pts

- Trace recording configured (`on-first-retry` or richer) and a short
  written walkthrough in the README of one real failing test
  encountered during development, showing how the HTML report and the
  trace viewer were used to find the cause. **[5 pts]**
- The generated HTML report is included with the submission (or a
  link/instructions to reproduce it are given). **[3 pts]**

#### Desired requirements — 8 pts

- At least one flaky test identified (or deliberately reproduced for
  demonstration) with a written explanation distinguishing whether it
  was a genuine race condition in the test vs. a real application
  defect, and the specific fix applied. **[5 pts]**
- A short "suite health" note in the README quoting flaky/skipped counts
  from a real run, and describing the quarantine strategy used (tagging
  + a separate project/job) for any test that couldn't be fixed
  outright. **[3 pts]**

### Outcome 6 — Continuous Integration & Execution Strategy (16 pts)

Minimum outcome: Run an automated test suite inside a continuous
integration pipeline.
Desired outcome: Weigh the trade-offs between parallel execution,
sharding, and retries, and propose a suitable execution pipeline.

#### Minimum requirements — 8 pts

- A working CI workflow (GitHub Actions or equivalent) that installs
  dependencies and browsers and runs the full suite automatically on
  push/pull request. **[5 pts]**
- The HTML report (or trace files) is uploaded from the CI run as a
  build artifact. **[3 pts]**

#### Desired requirements — 8 pts

- The CI pipeline uses sharding (a matrix strategy across multiple
  jobs) with a downstream job that merges the shard reports, correctly
  gated so a failed shard is still visible in the merged result.
  **[3 pts]**
- A written trade-off analysis (300–500 words) comparing parallel
  workers, sharding, and retries for this specific suite, ending in a
  concrete recommended CI configuration with reasoning. **[5 pts]**

## 5. Submission Requirements

Submit a single Git repository containing:

- The complete Playwright test suite (TypeScript), configuration, Page
  Objects, fixtures, and any helper/data files.
- A `README.md` covering: the application under test and how to run it,
  how to install and run the suite, the testing-strategy section
  (Outcome 1), the architecture note (Outcome 3), the debugging
  walkthrough (Outcome 5), and the CI trade-off analysis (Outcome 6).
- The CI workflow file(s) (e.g. `.github/workflows/*.yml`).
- Visual regression baselines and any HAR/fixture files the suite
  depends on, committed to the repository.
- A link to at least one CI run (Actions tab) showing the suite
  executing, with the HTML report/trace uploaded as a build artifact.

Submissions that do not run (`npx playwright test` fails to even start,
or the CI workflow is broken/unrunnable) will be capped at 50% of the
otherwise-earned score for the affected areas, since correctness cannot
be verified.

## 6. Academic Integrity

You may reuse and adapt code patterns shown in the course labs. AI
coding assistants may be used as a drafting aid (consistent with Week
15's discussion of AI-assisted test generation), but you must be able to
explain and defend every part of your suite, including locator choices,
fixture design, and any trade-offs discussed in your written sections.
Copying another student's test suite, in whole or in part, is not
permitted.
