# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

This repo has two purposes, in sequence:

1. **Final project specification** (done, locked): [`docs/PROJECT-SPECIFICATION.md`](docs/PROJECT-SPECIFICATION.md) is the assignment document handed to students of the *End-to-End Test Automation with Playwright* course, after they complete the companion 15-week Playwright lab course (a separate sibling repo, `../Playwright-masters-thesis-code`). It's transcribed from `Final_Project_Specification.docx` (the actual distributable file students receive, lives outside this repo — not committed here, since the Markdown copy already has the full content). **The source `.docx` is the ground truth if the two ever diverge** — re-sync this Markdown copy from it, don't edit the rubric independently here.

   Shape of the spec: 100 points across **6 outcome pairs** (minimum outcome / desired outcome each), ≈17 pts per pair (17/17/17/17/16/16), each pair split into a minimum-requirements checklist (worth 50 pts total across all 6) and a desired-requirements checklist (the other 50 pts). Students pick their own prior Algebra-course web app as the application under test — **or** fall back to the spec's own named reference project, `uni_course_management` (see below).

2. **Reference implementation** (next phase): this repo becomes the instructor's own worked example of that same spec, built against **`https://github.com/MatejStrlek/uni_course_management`** (*Rapid Development of Java Applications Using Frameworks*) — which the spec itself names as "Option B — the reference project" (`docs/PROJECT-SPECIFICATION.md` §2). Building the full reference solution against exactly that project doubles as: (a) the master's thesis's practical deliverable, proving the spec is buildable end-to-end, and (b) the actual answer key backing the spec's own fallback option. Must satisfy every minimum + desired requirement in the rubric, not just a subset.

`docs/THEORY.md` is copied verbatim from the sibling labs repo — the concept reference every spec requirement traces back to.

## Target application: `uni_course_management`

Source lives locally at `C:\Users\Matej\IdeaProjects\uni_course_management` (a separate repo — read from it freely for building Page Objects/fixtures, never write to it; nothing about this suite gets committed there). Nothing is symlinked in; it's just referenced by absolute path when needed.

**That repo now has its own `README.md` and `docs/API.md` — treat those as the authoritative reference** for routes, request/response shapes, seed data, and gotchas (more complete and more current than anything summarized below; re-read them directly rather than trusting a stale paraphrase here if anything seems off).

- **Run it via plain `docker run` of the prebuilt image** (decided over `docker compose`, which also brings up Prometheus/Grafana — unneeded for this suite):
  ```bash
  docker run -d --name uni-course-management -p 8081:8081 \
    -e MAIL_USERNAME=ci-test@example.com \
    -e MAIL_PASSWORD=ci-test-password \
    -e JWT_SECRET=CiTestSecretKeyThatIsAtLeast256BitsLongForHS256AlgorithmOk \
    ghcr.io/matejstrlek/uni_course_management:latest
  ```
  App comes up at `http://localhost:8081`. (A container with this name may already exist from a prior session — `docker start uni-course-management` if so, rather than erroring on the name conflict.) `java`/`mvn` are not on this machine's PATH, so Docker is the only practical way to run the app, both locally and in CI.
- **Stack**: Spring Boot 3.5 + Thymeleaf (server-rendered UI) + a separate stateless JWT REST API under `/api/**`. H2 in-memory DB, reseeded fresh on every container **restart** (not between test runs within the same running container — see quirks below) from `data.sql`.
- **Auth**: session-based form login at `/login` (`#username`, `#password`, `button[type=submit]`), CSRF disabled everywhere. Role-guarded paths: `/admin/**`, `/professor/**`, `/student/**` (role hierarchy `ADMIN > PROFESSOR`, `ADMIN > STUDENT`). REST API auth is separate and stateless: `POST /api/auth/login` returns a JWT (`Authorization: Bearer <accessToken>`, 15 min expiry) + refresh token (30 days); `/api/auth/me|refresh|logout|test-roles` also exist.
- **Seeded credentials** (all password `password`): `admin` (ADMIN), `mkrmpotic`/`aradovan`/`iobad`/`lkrmpotic`/`jpetrovic` (PROFESSOR — only the first 3 own courses), `sivanovic` + 6 more incl. `mgalic` (STUDENT). Full route table, REST endpoint list, and enum reference: `docs/API.md`.
- **Known quirks that affect test design** (from `docs/API.md`, not bugs to fix — this is a fixed test target):
  1. `POST`/`GET /api/grades` are guarded with `hasRole('ADMINISTRATOR')` (typo, not a real role) instead of `ADMIN` — an admin's JWT will always 403 on these two endpoints via the API. Grading through the web UI is unaffected.
  2. **Mutating state (enroll/drop/delete/grade) persists across test runs within the same running container**, only resetting on container restart — prefer creating throwaway entities over asserting exact seed-data counts.
  3. `GET /dashboard` is `permitAll` — renders without a session, just empty. Assert on content, not a 401/redirect.
  4. CSV export endpoints (`.../export-grades`) return `text/csv` with `Content-Disposition: attachment` — good candidates for `page.waitForEvent('download')`.
- **Surface area for tests**: course CRUD, course content CRUD, schedules, grades, enrollments, user management — 30 templates across admin/professor/student roles, comfortably enough for the spec's ≥15 E2E tests and ≥3-page visual/accessibility requirements.
- The app repo already has one small Java-based Playwright smoke test (`src/test/.../e2e/PlaywrightE2ETest.java`, login page only, CSS-ID locators) — useful as a sanity reference, not something this suite extends (this is a fully separate TypeScript repo per the spec's own rules).

## Build plan (tracks the spec's 6 outcome pairs)

Roughly follows the lab course's own week order (auth → structure → realistic conditions → data-driven → visual/a11y → flake → CI). Update the checkboxes here as phases complete, so a fresh session can see progress without re-deriving it.

- [x] Phase 0 — app running via Docker, reachable at `localhost:8081`
- [ ] Phase 1 — `playwright.config.ts` pointed at the app (`baseURL`), placeholder `tests/`/`tests-examples/` scaffold replaced
- [ ] Phase 2 — auth setup projects (`*.setup.ts`) → per-role `storageState`, `dependencies` wiring (Outcome 4 min)
- [ ] Phase 3 — Page Object Model for ≥3 pages/flows + a custom fixture (`base.extend`) (Outcome 3 min)
- [ ] Phase 4 — ≥15 independent, deterministic E2E tests across roles (Outcome 2 min, Outcome 3 min)
- [ ] Phase 5 — ≥2 `page.route()` network-interception tests; env-driven `baseURL` (Outcome 4 min)
- [ ] Phase 6 — ≥2 API tests via the `request` fixture against `/api/**` (JWT) + coverage-plan table (Outcome 1 desired)
- [ ] Phase 7 — ≥1 data-driven suite (≥5 variations) + dedup refactor of ≥3 tests (Outcome 2 desired)
- [ ] Phase 8 — `toHaveScreenshot()` baselines (≥3 pages) + axe-core scans (≥3 pages) with judged findings (Outcome 4 desired)
- [ ] Phase 9 — one real failure walkthrough (report + trace) + one flaky/race-condition test found or built, fixed or quarantined (Outcome 5 min + desired)
- [ ] Phase 10 — GitHub Actions CI (install/run/upload report) + sharding matrix with merge-reports (Outcome 6 min + desired)
- [ ] Phase 11 — `README.md` written sections: testing strategy, coverage plan, architecture note + diagram, critical evaluation, debugging walkthrough, suite-health note, CI trade-off analysis (Outcome 3 desired, Outcome 6 desired)
- [ ] Phase 12 — self-grade against the full rubric before calling it done

## Commands

```bash
docker start uni-course-management        # (or the docker run command in "Target application" below, first time)
npx playwright test                       # run all tests headless (all 3 browsers)
npx playwright test tests/<file>.spec.ts  # run a single file
npx playwright test -g "test title"       # run tests matching a title
npx playwright test --project=chromium    # run against one browser only
npx playwright test --ui                  # interactive UI mode
npx playwright test --debug               # step-through debugger
npx playwright codegen <url>               # record a new test by clicking through the site
npx playwright show-report                # open the last HTML report
```

`npm test` is aliased to `playwright test`.

## Architecture

- `playwright.config.ts` — `testDir: ./tests`, three browser projects (chromium, firefox, webkit), HTML reporter, trace captured `on-first-retry`. `baseURL`/`webServer`/real projects (setup + role-based) get added in Phase 1/2 of the build plan below — not done yet as of the last update to this file.
- `tests/` — the test suite (`testDir`), the only directory Playwright runs by default. Currently empty — the `npm init playwright` placeholder scaffold (`tests/example.spec.ts`, `tests-examples/`) was deliberately removed once the real target app was confirmed, so nothing generic is left to clean up later.
- `.github/workflows/playwright.yml` — still the generic `npm ci` → `npx playwright install --with-deps` → `npx playwright test` scaffold from init; needs real work in Phase 10 (bring up the target app via `docker run`, sharding matrix, merge-reports).
- `docs/PROJECT-SPECIFICATION.md` / `docs/THEORY.md` — see "Project" above. Per the spec's own §5 (Submission Requirements), the reference implementation's written deliverables (testing-strategy section, architecture note, debugging walkthrough, CI trade-off analysis, coverage plan, suite-health note) belong as **sections within the top-level `README.md`**, not separate `docs/` files — that's a deliberate change from this repo's earlier (pre-.docx) draft spec, don't reintroduce standalone `TESTING-STRATEGY.md`-style files.

## Environment gotcha

This machine's user-level `.npmrc` sets `allow-scripts` to only allow `@anthropic-ai/claude-code`, which blocks lifecycle (install/postinstall) scripts for other packages during `npm install`. When adding new npm dependencies, use `npm install --ignore-scripts <pkg>`. This does not affect CI (GitHub-hosted runners use their own npm config). Playwright browser binaries are a separate explicit step and are unaffected: `npx playwright install`.
