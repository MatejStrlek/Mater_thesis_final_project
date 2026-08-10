# uni_course_management — E2E Test Suite

Playwright test suite for [`uni_course_management`](https://github.com/MatejStrlek/uni_course_management), built as the reference implementation for the *End-to-End Test Automation with Playwright* course's final project specification (see `docs/PROJECT-SPECIFICATION.md`).

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

## Visual Regression

`toHaveScreenshot()` baselines cover 4 pages/components: `/login` (public), `/admin/users` and `/admin/dashboard` (admin), `/professor/schedule` (professor) — `tests/public/visual.spec.ts`, `tests/admin/visual.spec.ts`, `tests/professor/visual.spec.ts`. All four disable animations (`animations: 'disabled'`) to avoid Bootstrap's fade-in transitions causing flaky diffs. `/admin/dashboard` additionally masks its 4 stat cards' live numbers (`mask: [page.locator('.card-body strong')]`) — those counts genuinely change run to run, since this same suite's own admin course-CRUD and student enroll/drop tests mutate the underlying data concurrently.

Pages were deliberately chosen to be otherwise stable: `/admin/users`, `/admin/dashboard`'s layout, and `/professor/schedule` aren't touched by any mutating spec in this suite (no test creates/edits/deletes a user or a schedule entry), unlike `/admin/courses`, which was avoided as a screenshot target for exactly that reason.

**A screenshot isn't proof you're on the right page.** Early in this phase, `/professor/schedule` had a real bug — a `ScheduleController` view-name typo made it 500 unconditionally — but the screenshot and axe baselines were captured against that 500 page anyway and kept "passing," since neither check asserts page identity, only that whatever rendered stays visually/structurally stable. Once the bug was fixed upstream, every visual spec's `beforeEach` was given a `getByRole('heading', {...})` assertion for that page's real heading, run before the screenshot/axe call, so a wrong-page regression fails loudly instead of silently baselining the wrong content.

**Cross-platform caveat**: baselines are OS-specific (Playwright suffixes them `-win32`/`-linux`/`-darwin`). Both a Windows set (generated locally) and a Linux set (generated in a matching `mcr.microsoft.com/playwright` container, for CI's `ubuntu-latest` runner) are committed side by side — see the Debugging Walkthrough below for the real CI failure that happened before the Linux set existed.

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

**Fix**: generated real Linux baselines by running the visual specs inside `mcr.microsoft.com/playwright:v1.62.1-noble` (matching the installed `@playwright/test` version) against the same locally-running app container, reachable from the Playwright container at `host.docker.internal:8081`. Both `-win32` and `-linux` baselines are now committed side by side, so Windows development and the Linux CI runner each compare against their own platform's baseline.

## Flaky Test — Race Condition or Real Defect?

`tests/professor/grading.spec.ts` used to have two tests sharing CS101's roster: `grading a student completes their enrollment...` grades whichever student is "first available" in the active roster (`ProfessorGradingPage.gradeFirstAvailableStudent()` — deliberately not a hardcoded name, since grading is one-way), while `shows a pre-seeded grade for a still-active enrollment` asserted a specific hardcoded seeded row (`Marinkovic`, grade 4) was still there. CS101 has exactly 2 seeded enrollments, both pre-graded in `data.sql` but still `ENROLLED` — both are equally valid "first available" targets.

This failed for real, repeatedly, during this session: re-running the suite without restarting the container (quirk 1 above — mutating state persists until restart) eventually let the grading test consume *both* CS101 students across successive runs, at which point the pre-seeded-grade test's hardcoded row was simply gone and `getByRole('row', { name: 'Marinkovic' })` timed out.

**Race condition or defect?** Neither, cleanly — a test-design defect that only *looks* like a race. Within a single run it isn't really racing (`gradeFirstAvailableStudent` deterministically grades whichever row the query returns first, so the two tests don't fight over an outcome in real time); the problem is across runs against the same long-lived container, where one test's mutation silently invalidates another test's assumption. That's exactly what Outcome 2's own minimum requirement warns against — "no shared mutable state between tests" — it only presented as intermittent because "how many prior runs happened since the last restart" is effectively random from the test's point of view.

**Fix applied**: moved `shows a pre-seeded grade for a still-active enrollment` off CS101 entirely, onto MATH201 (`course.math201` in `utils/test-data.ts`) — a different course mkrmpotic also teaches, with its own independent pair of pre-seeded graded enrollments (`data.sql` grade ids 3-4, vs. CS101's 1-2). No test in this suite ever mutates MATH201's roster, so the assertion is now immune to the other test's consumption of CS101 by construction, not by luck. Verified with `--repeat-each=3` against a single un-restarted container: 12/12 passed — the exact scenario that used to fail.

## Suite Health

A representative local run on a freshly restarted container: **37/37 passed** (`npx playwright test`, ~9s). The CI run referenced above: 33 passed / 4 failed, all 4 explained and fixed above. No test is currently skipped or quarantined.

**Quarantine strategy** (not currently needed, but the mechanism this suite would reach for): tag a flaky test's title with a marker like `@quarantine`, and add a project to `playwright.config.ts` that runs only `--grep @quarantine` with extra retries, wired into a separate CI job that's allowed to fail (`continue-on-error: true`) without blocking the main `e2e-tests` job. That keeps a known-flaky test's coverage intact and visible instead of deleting it outright, while stopping it from blocking merges. Both failures found this session had a real root cause and a real fix instead, so nothing currently needs this — but the professor-grading incident above is exactly the shape of bug this mechanism exists for, if a fix isn't immediately available next time.
