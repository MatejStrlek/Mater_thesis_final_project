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

const PLAYWRIGHT_TEST_ARGS = RELATIVE_SPECS.map((s) => `tests/${s}`);

module.exports = { RELATIVE_SPECS, PLAYWRIGHT_TEST_ARGS };
