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
| REST authorization boundary (grades endpoints' `ADMINISTRATOR` role typo vs. the real role hierarchy) | API | A permission-boundary question — cheapest and most precise to assert via direct HTTP calls with different bearer tokens, not a UI journey. `tests/api/grades.spec.ts` |
