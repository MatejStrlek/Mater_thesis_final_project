# uni_course_management — E2E Test Suite

Playwright test suite for [`uni_course_management`](https://github.com/MatejStrlek/uni_course_management), built as the reference implementation for the *End-to-End Test Automation with Playwright* course's final project specification (see `docs/PROJECT-SPECIFICATION.md`).

**Base application** (spec §2, Option B — the reference project): [`uni_course_management`](https://github.com/MatejStrlek/uni_course_management) — *Rapid Development of Java Applications Using Frameworks*.
**Tech stack under test**: Spring Boot 3.5 + Thymeleaf (server-rendered UI, session-based auth) with a separate stateless JWT REST API under `/api/**`; H2 in-memory database.

## Project Overview & Setup

`uni_course_management` is a Spring Boot 3.5 + Thymeleaf server-rendered web app (Spring Security session login, H2 in-memory DB) with a separate stateless JWT REST API under `/api/**`, managing university courses, enrollments, grades, and schedules across three roles — Admin, Professor, Student. This repo is a TypeScript Playwright suite testing it as a black box (no access to or changes in its Java source).

**This suite's stack**: `@playwright/test`, `@axe-core/playwright` for accessibility scans, Docker to run the target app.

**Install**:
```bash
npm ci
npx playwright install --with-deps
```

**Start the target app** (H2 reseeds on container *restart* only, never between test runs — see quirk 1 below):
```bash
docker run -d --name uni-course-management -p 8081:8081 \
  -e MAIL_USERNAME=ci-test@example.com \
  -e MAIL_PASSWORD=ci-test-password \
  -e JWT_SECRET=CiTestSecretKeyThatIsAtLeast256BitsLongForHS256AlgorithmOk \
  ghcr.io/matejstrlek/uni_course_management:latest
```
(`docker start uni-course-management` on later runs, rather than `docker run` again.)

**Run the suite**:
```bash
npx playwright test                       # everything
npx playwright test --project=admin       # one role (also: public, professor, student, api)
npx playwright test --ui                  # interactive UI mode
npx playwright show-report                # last HTML report
```

`BASE_URL` (default `http://localhost:8081`, see `utils/env.ts`) is the only environment override most setups need.

## Testing Strategy

E2E testing's role in this project's QA isn't abstract — it maps directly onto where `uni_course_management`'s real risk lives, and that shapes how it differs from unit or integration testing here specifically. The app is a thin, mostly server-rendered orchestration layer (Spring MVC controllers + Thymeleaf templates + Spring Security's role hierarchy) over a handful of straightforward services and a small schema. Its riskiest behavior isn't computational: `GradeService.assignGrade()`'s clamp-and-upsert logic or `JwtService`'s token signing are exactly the narrow, pure-function surfaces unit tests cover cheaply and exhaustively — the Test Coverage Plan below says so explicitly, and this suite doesn't try to re-cover that ground.

What unit or integration tests structurally *can't* see is the interaction between layers. Whether a role-guarded route actually redirects an unauthenticated visitor to `/login`. Whether a Thymeleaf template renders the *localized* button text (`messages.properties`) rather than its inline fallback — a real mismatch this suite caught in Phase 3, where `admin/courses/list.html`'s fallback text differed from what the browser actually showed. Whether grading a student really does make them vanish from the professor's own roster page on the very next render — a side effect that only exists at the intersection of `GradeService`'s `COMPLETED` status write and the roster query's `ENROLLED` filter, and the clearest example in this suite of a bug an E2E test catches that a unit test, testing each piece in isolation, structurally cannot.

Integration tests (e.g. `@SpringBootTest` against a real `DataSource`) sit between the two — the right layer for verifying that `EnrollmentRestController`'s `@PreAuthorize` enforces `STUDENT`-only access at the Spring Security filter level, without a browser. But they still can't say whether the *user* — clicking a real "Enroll" button, reading a real flash message, waiting on a real CSV download — gets the experience the app is supposed to deliver. That gap is what this suite exists to close: role-based journeys across real page loads (`tests/admin/`, `tests/professor/`, `tests/student/`), the REST API's actual JSON contract independent of any UI (`tests/api/`), and the app's rendered failure states under conditions too slow or disruptive to reproduce for real (`tests/*/*-network.spec.ts`).

None of this substitutes for unit or integration coverage this repo doesn't own — it tests the app as a black box, not its Java internals. It's deliberately the outermost, slowest, most expensive layer of a pyramid the Test Coverage Plan below sketches the rest of.

## Test Coverage Plan

Maps the application's main features to the test layer best suited to it, and why. `uni_course_management` is a server-rendered Spring Boot + Thymeleaf app with a separate stateless JWT REST API — that shape is why several rows below land on E2E rather than component tests: there's no isolated component-rendering harness for Thymeleaf fragments in this stack, so UI-level behavior is only observable by driving the real page.

| Feature / page | Test type | Why |
|---|---|---|
| JWT signing/parsing, password hashing (`JwtService`, `PasswordEncoder` usage) | Unit | Pure logic with no HTTP round trip — fastest way to cover edge cases (expired tokens, malformed claims) exhaustively. |
| Grade upsert logic (`GradeService.assignGrade` — clamp 1–5, insert-vs-update by `enrollmentId`) | Unit | A small branching method; a Spring context or browser is unnecessary overhead for exercising its input space. |
| Role hierarchy resolution (`ROLE_ADMIN > ROLE_PROFESSOR/ROLE_STUDENT`) | Unit / slice | Framework configuration (`RoleHierarchyImpl`) — a narrow security-context test proves it without booting the whole app. |
| Thymeleaf list/detail fragments (course list, roster tables, schedule grid) | *(Component — N/A)* | No isolated component-rendering harness exists for server-rendered Thymeleaf templates in this stack; covered by E2E instead. |
| Admin course CRUD (create/edit/delete) | E2E | Spans auth, role guard, form validation, persistence, and redirect together — a real user journey, not a unit of logic. `tests/admin/courses.spec.ts` |
| Student enroll/drop flow | E2E | Mutating and stateful, and crosses two pages (available courses → my enrollments) — representative of a real multi-step journey. `tests/student/courses.spec.ts` |
| Professor grading + roster side effect (grading removes a student from the active roster) | E2E | The interaction between `GradeService`'s `COMPLETED` side effect and the roster query's `ENROLLED` filter can only be observed by driving two real page loads in sequence. `tests/professor/grading.spec.ts` |
| CSV grade export | E2E | Needs a real browser download event (`page.waitForEvent('download')`); not meaningfully testable without one. `tests/professor/grading.spec.ts` |
| Backend failure / edge-case responses (500 outage, capacity-full error) | E2E (mocked via `page.route()`) | States that are slow or disruptive to provoke against the real backend; interception mocks the response while still exercising real page rendering. `tests/admin/courses-network.spec.ts`, `tests/student/courses-network.spec.ts` |
| REST auth (`POST /api/auth/login`, `GET /api/auth/me`, unauthenticated rejection) | API | Stateless request/response contract — cheapest and most precise way to check status codes and payload shape, no browser needed. `tests/api/auth.spec.ts` |
| REST course listing (`GET /api/courses`) | API | Same reasoning — verifies the JSON contract directly rather than through rendered HTML. `tests/api/courses.spec.ts` |
| REST enrollment lifecycle (`POST`/`GET`/`DELETE /api/enrollments`) | API | The same enroll/drop journey as the E2E row above, but exercised at the API contract level, independent of Thymeleaf rendering. `tests/api/enrollments.spec.ts` |
| REST authorization boundary (grades endpoints' role check) | API | A permission-boundary question — cheapest and most precise to assert via direct HTTP calls with different bearer tokens, not a UI journey. `tests/api/grades.spec.ts` |

## Architecture

```
tests/        testDir — the only thing Playwright discovers as specs.
               Per-role subfolders (admin/, professor/, student/, public/, api/) + auth.setup.ts.
pages/         Page Object Model, mirrors the app's own controller/template split.
               BasePage.ts, LoginPage.ts, admin/, professor/, student/.
fixtures/      fixtures/index.ts — one base.extend() merging every Page Object
               into a single custom `test`, imported by every spec instead of @playwright/test directly.
utils/         env.ts (baseURL/storageState paths), test-data.ts (seeded users/courses/ids),
               api-client.ts (JWT login for API tests), axe.ts (accessibility allowlist).
```

`pages/`, `fixtures/`, and `utils/` are deliberately outside `testDir` so Playwright never mistakes support code for specs.

**Fixture composition** — every spec and `auth.setup.ts` imports `test`/`expect` from `fixtures/index.ts`, never from `@playwright/test` directly:

```mermaid
flowchart LR
  PT["@playwright/test<br/>base test"] --> FX["fixtures/index.ts<br/>base.extend({ loginPage, adminCoursesPage, ... })"]
  BP["pages/BasePage.ts<br/>(logout, row helper)"] --> LP[LoginPage]
  BP --> ACP[AdminCoursesPage]
  BP --> PCP[ProfessorCoursesPage]
  BP --> PGP[ProfessorGradingPage]
  BP --> SCP[StudentCoursesPage]
  BP --> SEP[StudentEnrollmentsPage]
  LP --> FX
  ACP --> FX
  PCP --> FX
  PGP --> FX
  SCP --> FX
  SEP --> FX
  FX --> SPEC["tests/**/*.spec.ts<br/>import { test, expect } from '../../fixtures'"]
```

Every Page Object extends `BasePage` (shared `logout()` + a protected `row(text)` locator helper) instead of duplicating it — the same "small base, composed extensions" idea the spec's "login fixture built on a base fixture" example describes, just applied to Page Objects. The actual login/auth composition lives in `playwright.config.ts` instead: the `setup` project (matches `auth.setup.ts`) logs in as all three roles once and writes `playwright/.auth/{role}.json`; `admin`/`professor`/`student` each declare `dependencies: ['setup']` and load their role's `storageState`, so no spec ever re-does the login UI flow to reach an authenticated page. `public` needs neither (unauthenticated flows); `api` manages its own JWT per test via `utils/api-client.ts`.

**Page Object layering**: each Page Object owns exactly one page or flow's locators and actions (`AdminCoursesPage` → `/admin/courses`, `ProfessorGradingPage` → `/professor/courses/{id}/students`) and is the only place that page's locators live — specs call `adminCoursesPage.createCourse(...)`, not `page.getByRole(...)`, for anything a Page Object already covers.

**Readable reports**: non-trivial multi-phase tests (course create/edit, enroll/drop, grading, the API enrollment lifecycle) use `test.step()` to name each phase, so a failure's HTML report entry reads as "Fill out and submit the new-course form ✓ / Verify it appears in the course list ✗" instead of one opaque block.

## Critical Evaluation

**Weakness**: `uni_course_management` has no test-only reset endpoint and no per-request transaction rollback — its H2 database only reseeds on container **restart**, never between requests or test runs (`docs/API.md`'s own documented quirk, confirmed repeatedly this session). That's a real testability gap in the app itself: a test suite has no way to ask for a clean slate without tearing down and rebuilding the whole container, far too slow to do per-test or even per-file.

**Concrete consequence**: an earlier version of this suite was written the way a fresh-database mental model tempts you to write it — asserting against specific seeded rows by name. `professor/grading.spec.ts` originally hardcoded a check for the seeded row `'Marinkovic'` with grade 4 on CS101, in the same file as a *different* test that grades away "whichever student is first" on that same CS101 roster. Both tests passed in isolation. Both broke for real, repeatedly, once the suite was actually re-run against one long-lived container across a working session — exactly the shape of bug this gap in the app predicts, and the incident the Flaky Test section below covers in full.

**How the final structure addresses it**:
1. Centralizes seed-data facts in `utils/test-data.ts` (`course`, `courseId`, `enrollmentId`) instead of scattering literal values, so which seed rows are "spoken for" by which test is visible in one place.
2. Prefers throwaway entities over asserting exact counts: `admin/courses.spec.ts` creates its own `TEST101`-style courses and deletes them in `afterEach`, rather than depending on the seed roster staying a fixed size.
3. Where a test genuinely needs a *specific* pre-seeded row, it's scoped to a course no other test ever mutates (`professor/grading.spec.ts`'s pre-seeded-grade test now reads MATH201, not CS101).
4. `ProfessorGradingPage.gradeFirstAvailableStudent()` grades whichever row is first rather than a hardcoded name, since grading is a one-way mutation — the test adapts to whatever state exists instead of assuming a specific one.

None of this removes the underlying gap — a real reset endpoint would still be strictly better — but it means this suite's own tests no longer compound the problem the way its earlier version did.

## Visual Regression

`toHaveScreenshot()` baselines cover 4 pages/components: `/login` (public), `/admin/users` and `/admin/dashboard` (admin), `/professor/schedule` (professor) — `tests/public/visual.spec.ts`, `tests/admin/visual.spec.ts`, `tests/professor/visual.spec.ts`. All four disable animations (`animations: 'disabled'`) to avoid Bootstrap's fade-in transitions causing flaky diffs. `/admin/dashboard` additionally masks its 4 stat cards' live numbers (`mask: [page.locator('.card-body strong')]`) — those counts genuinely change run to run, since this same suite's own admin course-CRUD and student enroll/drop tests mutate the underlying data concurrently.

Pages were deliberately chosen to be otherwise stable: `/admin/users`, `/admin/dashboard`'s layout, and `/professor/schedule` aren't touched by any mutating spec in this suite (no test creates/edits/deletes a user or a schedule entry), unlike `/admin/courses`, which was avoided as a screenshot target for exactly that reason.

**A screenshot isn't proof you're on the right page.** Early in this phase, `/professor/schedule` had a real bug — a `ScheduleController` view-name typo made it 500 unconditionally — but the screenshot and axe baselines were captured against that 500 page anyway and kept "passing," since neither check asserts page identity, only that whatever rendered stays visually/structurally stable. Once the bug was fixed upstream, every visual spec's `beforeEach` was given a `getByRole('heading', {...})` assertion for that page's real heading, run before the screenshot/axe call, so a wrong-page regression fails loudly instead of silently baselining the wrong content.

**Cross-platform caveat**: baselines are OS-specific (Playwright suffixes them `-win32`/`-linux`/`-darwin`). Both a Windows set (generated locally) and a Linux set (generated in a matching `mcr.microsoft.com/playwright` container, for CI's `ubuntu-latest` runner) are committed side by side — see the Debugging Walkthrough below for the real CI failure that happened before the Linux set existed, and a second round after it.

## Accessibility Findings

Scanned the same 3 authenticated/public pages used above for visual regression with `axe-core` (`@axe-core/playwright`): `/login`, `/admin/users`, `/professor/schedule`.

| Violation | Pages | Verdict |
|---|---|---|
| `html-has-lang` (serious) — `<html>` has no `lang` attribute | login | **Accepted.** Reported to the app's maintainer, who chose to leave it as-is rather than take a one-line template fix — a real, known gap, not an oversight in this suite. |
| `color-contrast` (serious) — navbar link text fails the minimum contrast ratio (2.36:1 against a required 4.5:1 — Bootstrap's default `navbar-dark .nav-link` opacity over `bg-primary`) | admin/users | **Accepted**, same as above — reported and consciously left unfixed. |
| `landmark-one-main` / `region` (moderate) — no page wraps its content in a `<main>` landmark | all 3 | **Accepted.** Every template in the app shares this gap — it's a layout-wide pattern, not a per-page bug, and fixing it means restructuring every page's layout. Out of scope for a test suite that doesn't own the app's source. |
| `page-has-heading-one` (moderate) — pages use `<h2>`/`<h3>` instead of `<h1>` for their primary heading | login, admin/users | **Accepted.** The heading text itself (`"User Management"`, `"My Schedule"`) is still present and meaningful to assistive tech; this is a heading-*level* choice, not a loss of information. |

**What automated scanning does and doesn't guarantee**: `axe-core` reliably catches objectively-wrong markup — a missing attribute, an insufficient contrast ratio, a missing landmark — cheaply enough to run on every commit. What it can't tell you is whether the app is actually *usable* with a screen reader: whether tab order matches visual order, whether a form's validation errors get announced when they appear, whether the CSV download flow makes sense narrated aloud, whether a dropdown traps focus correctly. Every violation found here is a DOM-structure fact a machine can check in isolation; none of them substitute for someone actually navigating the app with a keyboard and a screen reader, which this suite doesn't do. "Zero axe violations" is a floor, not a certification.

## Debugging Walkthrough

Trace recording is configured in `playwright.config.ts` (`trace: 'on-first-retry'`), and the CI workflow uploads `playwright-report/` as a build artifact on every run (`actions/upload-artifact@v4`, `if: ${{ !cancelled() }}`) — open it locally with `npx playwright show-report` to browse the same report CI produced, traces included.

A real CI run ([`#31427516827`](https://github.com/MatejStrlek/Mater_thesis_final_project/actions/runs/31427516827), 2026-08-10) failed like this:

```
4 failed
    [public] › tests/public/visual.spec.ts › Login page — visual & accessibility › matches its visual baseline
    [admin] › tests/admin/visual.spec.ts › Admin users — visual & accessibility › matches its visual baseline
    [admin] › tests/admin/visual.spec.ts › Admin dashboard — visual › matches its visual baseline, with live stat counts masked
    [professor] › tests/professor/visual.spec.ts › Professor schedule — visual & accessibility › matches its visual baseline
  33 passed
```

Every failure was a `toHaveScreenshot()` assertion — nothing else, including the axe scans on those same 3 pages. The workflow's `retries: 2` (combined with `trace: 'on-first-retry'`) meant each of those 4 had already been retried twice and still failed, which rules out ordinary timing flakiness — a retry absorbs that, not a deterministic mismatch. A failure isolated to exactly one assertion *type*, reproducible on every retry, points at that assertion's own precondition rather than the app: `toHaveScreenshot()` baselines are OS-suffixed (`login-public-win32.png` locally; CI's `ubuntu-latest` runner needs `login-public-linux.png`), and only the Windows-generated set had been committed at that point — CI had no Linux baseline to compare against.

To exercise the actual HTML-report/trace-viewer workflow (the real CI job logs need repo-admin auth this session didn't have), the same failure mode was reproduced locally: a wrong baseline was swapped into `login-public-win32.png` and the test re-run with `--trace=on`. The HTML report's diff view showed it immediately —

```
178219 pixels (ratio 0.20 of all image pixels) are different.
Expected: tests/public/visual.spec.ts-snapshots/login-public-win32.png
Received: test-results/.../login-actual.png
Diff:     test-results/.../login-diff.png
```

— with the diff image overlaying the (wrong) admin-users page directly on top of the real login page in red. The trace viewer's action list showed the test itself behaved correctly (`goto('/login')`, the heading assertion passed, the screenshot was captured) — the mismatch was entirely in what the assertion was compared *against*, not in what actually rendered. That's the tell: functional steps green, one visual assertion red, diff pointing at "wrong expected image" rather than "wrong page."

**First fix, incomplete**: generated real Linux baselines by running the visual specs inside `mcr.microsoft.com/playwright:v1.62.1-noble` (matching the installed `@playwright/test` version) against the same locally-running app container, reachable from the Playwright container at `host.docker.internal:8081`. Both `-win32` and `-linux` baselines were committed side by side — and the very next CI run still failed all 4 screenshot tests.

The diff images from that run (downloaded from the failed run's `playwright-report` artifact) ruled out "wrong page" again: every diff showed the *same* content twice, offset by a few pixels, text subtly doubled — the signature of two renderers agreeing on layout but disagreeing on font metrics, not two different pages. `ubuntu-latest` + `npx playwright install --with-deps` and the `mcr.microsoft.com/playwright` Docker image both count as "linux" for baseline-suffix purposes, but they don't ship the same bundled font set, so text takes up very slightly different width in each — enough to fail `toHaveScreenshot()`'s pixel-diff threshold even though nothing was actually wrong. Confirmed by comparing the CI run's actual rendered screenshot side by side with the committed baseline: same structure, same data, a few pixels of drift throughout.

**Real fix**: instead of trying to match fonts by hand on the bare runner, the CI workflow now runs the *test execution step itself* inside `mcr.microsoft.com/playwright:v1.62.1-noble` (`docker run --network=host ... npx playwright test --shard=...`), the exact image used to generate the baselines — so CI renders through the identical font set instead of an approximation of it. `playwright install --with-deps` was removed from the workflow entirely (no longer needed; the Docker image already has matching browsers bundled). Verified against a real CI run afterward: [`#31431332054`](https://github.com/MatejStrlek/Mater_thesis_final_project/actions/runs/31431332054) — both shards green, `merge-reports` green.

## Flaky Test — Race Condition or Real Defect?

`tests/professor/grading.spec.ts` used to have two tests sharing CS101's roster: `grading a student completes their enrollment...` grades whichever student is "first available" in the active roster (`ProfessorGradingPage.gradeFirstAvailableStudent()` — deliberately not a hardcoded name, since grading is one-way), while `shows a pre-seeded grade for a still-active enrollment` asserted a specific hardcoded seeded row (`Marinkovic`, grade 4) was still there. CS101 has exactly 2 seeded enrollments, both pre-graded in `data.sql` but still `ENROLLED` — both are equally valid "first available" targets.

This failed for real, repeatedly, during this session: re-running the suite without restarting the container (quirk 1 above — mutating state persists until restart) eventually let the grading test consume *both* CS101 students across successive runs, at which point the pre-seeded-grade test's hardcoded row was simply gone and `getByRole('row', { name: 'Marinkovic' })` timed out.

**Race condition or defect?** Neither, cleanly — a test-design defect that only *looks* like a race. Within a single run it isn't really racing (`gradeFirstAvailableStudent` deterministically grades whichever row the query returns first, so the two tests don't fight over an outcome in real time); the problem is across runs against the same long-lived container, where one test's mutation silently invalidates another test's assumption. That's exactly what Outcome 2's own minimum requirement warns against — "no shared mutable state between tests" — it only presented as intermittent because "how many prior runs happened since the last restart" is effectively random from the test's point of view. The Critical Evaluation section above traces this same incident back to its root cause in the app's own testability.

**Fix applied**: moved `shows a pre-seeded grade for a still-active enrollment` off CS101 entirely, onto MATH201 (`course.math201` in `utils/test-data.ts`) — a different course mkrmpotic also teaches, with its own independent pair of pre-seeded graded enrollments (`data.sql` grade ids 3-4, vs. CS101's 1-2). No test in this suite ever mutates MATH201's roster, so the assertion is now immune to the other test's consumption of CS101 by construction, not by luck. Verified with `--repeat-each=3` against a single un-restarted container: 12/12 passed — the exact scenario that used to fail.

**A second, genuine race** turned up building `tests/shared/localization.spec.ts` (language switcher coverage across all 3 roles). Its persistence test reused the same shared `authStatePath('student')` storageState every other student-role spec does — safe for them, since they only mutate DB rows scoped to a user identity, but the language switcher mutates *session*-scoped state (Spring's `SessionLocaleResolver`, keyed by `JSESSIONID`). Two tests sharing that storageState file share the literal same server-side session: a screenshot mid-investigation showed the persistence test's page rendered in German where Croatian was expected, because a *different* concurrent test reusing the same file happened to switch to German mid-flight. This one is a genuine race, unlike the CS101 incident — real concurrent execution, not cross-run state. Fixed by having every language-switching test log in fresh instead of reusing shared storageState, the one deliberate exception in this suite to Outcome 4 min's "no test re-does the login flow" rule (commented in place). Verified with `--repeat-each=3` across 6 parallel workers: 12/12.

## Suite Health

A representative local run on a freshly restarted container: **37/37 passed** (`npx playwright test`, ~9s). The CI run referenced above: 33 passed / 4 failed, all 4 explained and fixed above; the follow-up run after the real fix: all green. No test is currently skipped or quarantined.

**Quarantine strategy** (not currently needed, but the mechanism this suite would reach for): tag a flaky test's title with a marker like `@quarantine`, and add a project to `playwright.config.ts` that runs only `--grep @quarantine` with extra retries, wired into a separate CI job that's allowed to fail (`continue-on-error: true`) without blocking the main `e2e-tests` job. That keeps a known-flaky test's coverage intact and visible instead of deleting it outright, while stopping it from blocking merges. Every failure found this session had a real root cause and a real fix instead, so nothing currently needs this — but the professor-grading incident above is exactly the shape of bug this mechanism exists for, if a fix isn't immediately available next time.

## CI Trade-off Analysis

This suite currently has 37 tests completing in ~8–10s of actual test execution — small enough that most of a CI run's wall-clock time is fixed overhead (checkout, `npm ci`, pulling/starting/waiting on the target app's Docker image), not test time. That shapes every trade-off below.

**Parallel workers** (multiple workers inside one job, one shared app container) are the cheapest form of parallelism — no extra runner, no extra app-container startup cost — but they're risky for this specific app. `uni_course_management`'s H2 database only resets on container restart (quirk 1 above), and Phase 6 found a real race from it: two API specs concurrently touching the same seeded student's enrollments intermittently tripped a server-side JSON-serialization bug. `playwright.config.ts`'s `workers: process.env.CI ? 1 : undefined` is a deliberate response — a single shared, mutating-state app container is safer serialized than parallelized. Locally, without that constraint, the default multi-worker count is fine because a developer notices a flake and re-runs; in CI, a flaky failure just blocks a PR.

**Sharding** (separate jobs/runners, each with its own app container) sidesteps that risk entirely — each shard's mutations are isolated to its own container, so shards can safely run in parallel even though workers-within-a-job can't. That's the real reason this suite added a 2-shard matrix rather than just raising `workers` in CI: it's the safe axis of parallelism for an app with global mutable state. The cost is duplicated fixed overhead — two shards each pay their own `npm ci` and Docker pull/start/wait, which for a suite this small can make total wall-clock time *worse* than one unsharded job, not better. Sharding only pays off once test execution time itself dominates that per-shard overhead; this suite isn't there yet, but the matrix + `merge-reports` plumbing (`.github/workflows/playwright.yml`) is in place for when it grows, gated with `if: ${{ !cancelled() }}` so a failed shard still shows up in the merged report instead of vanishing.

**Retries** (`retries: 2` in CI) exist for genuine environmental flakiness — a slow CDN asset, a momentarily slow DB query — not to paper over a deterministic bug. The Debugging Walkthrough above leaned on exactly this distinction twice: a failure that survives 2 retries isn't flaky, it's real, which is what pointed at the missing Linux baseline (and later, the font mismatch) rather than a timing issue.

**Recommendation for this suite today**: keep `workers: 1` in CI (protects the one shared, stateful app container per job), keep the 2-shard matrix (demonstrates the safe parallelism axis and roughly halves wall-clock test time without risking cross-worker races), keep `retries: 2` for genuine transient flakiness. Revisit the shard count upward only once test execution time meaningfully exceeds the fixed per-shard setup cost — worth re-measuring once the suite is past roughly 100 tests.
