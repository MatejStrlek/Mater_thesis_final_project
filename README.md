# uni_course_management — E2E Test Suite

Playwright test suite for [`uni_course_management`](https://github.com/MatejStrlek/uni_course_management), built as the reference implementation for the *End-to-End Test Automation with Playwright* course's final project specification (see `docs/PROJECT-SPECIFICATION.md`).

> This README is written incrementally as the suite is built. Sections such as setup instructions, testing strategy, architecture, and CI trade-offs are added in later phases — see `CLAUDE.md`'s build plan for status.

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

**Cross-platform caveat**: baselines are OS-specific (Playwright suffixes them `-win32`/`-linux`/`-darwin`), generated here on Windows. CI runs on `ubuntu-latest` and will need its own Linux baselines — see the CI trade-off analysis (Phase 11) for how that's handled.

## Accessibility Findings

Scanned the same 3 authenticated/public pages used above for visual regression with `axe-core` (`@axe-core/playwright`): `/login`, `/admin/users`, `/professor/schedule`.

| Violation | Pages | Verdict |
|---|---|---|
| `html-has-lang` (serious) — `<html>` has no `lang` attribute | login | **Accepted.** Reported to the app's maintainer, who chose to leave it as-is rather than take a one-line template fix — a real, known gap, not an oversight in this suite. |
| `color-contrast` (serious) — navbar link text fails the minimum contrast ratio (2.36:1 against a required 4.5:1 — Bootstrap's default `navbar-dark .nav-link` opacity over `bg-primary`) | admin/users | **Accepted**, same as above — reported and consciously left unfixed. |
| `landmark-one-main` / `region` (moderate) — no page wraps its content in a `<main>` landmark | all 3 | **Accepted.** Every template in the app shares this gap — it's a layout-wide pattern, not a per-page bug, and fixing it means restructuring every page's layout. Out of scope for a test suite that doesn't own the app's source. |
| `page-has-heading-one` (moderate) — pages use `<h2>`/`<h3>` instead of `<h1>` for their primary heading | login, admin/users | **Accepted.** The heading text itself (`"User Management"`, `"My Schedule"`) is still present and meaningful to assistive tech; this is a heading-*level* choice, not a loss of information. |

**What automated scanning does and doesn't guarantee**: `axe-core` reliably catches objectively-wrong markup — a missing attribute, an insufficient contrast ratio, a missing landmark — cheaply enough to run on every commit. What it can't tell you is whether the app is actually *usable* with a screen reader: whether tab order matches visual order, whether a form's validation errors get announced when they appear, whether the CSV download flow makes sense narrated aloud, whether a dropdown traps focus correctly. Every violation found here is a DOM-structure fact a machine can check in isolation; none of them substitute for someone actually navigating the app with a keyboard and a screen reader, which this suite doesn't do. "Zero axe violations" is a floor, not a certification.
