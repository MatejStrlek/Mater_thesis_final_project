import { test, expect } from '../../fixtures';
import { course } from '../../utils/test-data';

// "Shows a pre-seeded grade" reads MATH201's roster, deliberately separate
// from the describe block below, which grades away CS101's first available
// student. They used to share CS101: gradeFirstAvailableStudent() could
// (and repeatedly did, this session) consume the exact seeded row the other
// test asserted on, since both are ENROLLED with a pre-seeded grade and
// "first available" isn't guaranteed to mean "the other test's row." See
// README.md's suite-health note for the real failure this caused.
test.describe('Professor grading — pre-seeded grade', () => {
  test.beforeEach(async ({ professorCoursesPage }) => {
    await professorCoursesPage.goto();
    await professorCoursesPage.manageStudents(course.math201);
  });

  test('shows a pre-seeded grade for a still-active enrollment', async ({ professorGradingPage }) => {
    await professorGradingPage.expectCurrentGrade('Petrovic', 3);
  });
});

test.describe('Professor grading', () => {
  test.beforeEach(async ({ professorCoursesPage }) => {
    await professorCoursesPage.goto();
    await professorCoursesPage.manageStudents(course.cs101);
  });

  test('grading a student completes their enrollment and removes them from the active roster', async ({
    professorGradingPage,
  }) => {
    const gradedStudent = await professorGradingPage.gradeFirstAvailableStudent(5);
    await professorGradingPage.expectNotInRoster(gradedStudent);
  });

  test('exports the course roster as a CSV download', async ({ professorGradingPage }) => {
    const download = await professorGradingPage.exportCsv();
    expect(download.suggestedFilename()).toContain('.csv');
  });
});
