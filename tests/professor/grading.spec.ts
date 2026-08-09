import { test, expect } from '../../fixtures';

test.describe('Professor grading', () => {
  test.beforeEach(async ({ professorCoursesPage }) => {
    await professorCoursesPage.goto();
    await professorCoursesPage.manageStudents('CS101');
  });

  test('shows a pre-seeded grade for a still-active enrollment', async ({ professorGradingPage }) => {
    await professorGradingPage.expectCurrentGrade('Marinkovic', 4);
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
