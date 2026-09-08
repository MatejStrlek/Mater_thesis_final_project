/**
 * The 12 spec files both suites actually share — verified directly
 * against both repos' real tests/ trees (not trusted from either
 * README's file count, which claimed 15). Same relative paths in both
 * repos by construction. Used by every hypothesis script that needs to
 * scope Playwright down to Selenium's comparable subset (Playwright's
 * own suite has 10 more files — visual regression, network-mocking, API
 * tests — that are explicitly out of scope for the framework comparison,
 * see docs/FRAMEWORK-EVALUATION.md's precondition).
 */

const RELATIVE_SPECS = [
  'public/login.spec.ts',
  'admin/courses.spec.ts',
  'admin/schedule.spec.ts',
  'admin/users.spec.ts',
  'admin/content.spec.ts',
  'professor/courses.spec.ts',
  'professor/grading.spec.ts',
  'professor/content.spec.ts',
  'student/courses.spec.ts',
  'student/permissions.spec.ts',
  'shared/localization.spec.ts',
  'shared/student-content.spec.ts',
];

/**
 * H6 added 5 Firefox projects to playwright.config.ts with the same
 * testMatch globs as their Chrome counterparts (project name doesn't gate
 * testMatch) — so a bare file-path invocation with no --project filter
 * silently matches both, doubling the measured scope from 45 to 87 tests.
 * Confirmed via `npx playwright test <these files> --list`. Pinning to the
 * original 5 Chrome-equivalent projects + setup keeps this comparable to
 * every H1/H2 run collected before H6 existed.
 */
const PLAYWRIGHT_PROJECTS = ['setup', 'public', 'admin', 'professor', 'student', 'shared'];

const PLAYWRIGHT_TEST_ARGS = [
  ...RELATIVE_SPECS.map((s) => `tests/${s}`),
  ...PLAYWRIGHT_PROJECTS.map((p) => `--project=${p}`),
];

module.exports = { RELATIVE_SPECS, PLAYWRIGHT_PROJECTS, PLAYWRIGHT_TEST_ARGS };
