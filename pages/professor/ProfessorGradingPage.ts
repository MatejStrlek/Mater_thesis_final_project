import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * /professor/courses/{id}/students — roster + grading for one course.
 *
 * Grading a student is a one-way action: GradeService.assignGrade()
 * marks the enrollment COMPLETED as a side effect, and this roster only
 * queries ENROLLED enrollments — so a just-graded student's row
 * disappears from this page immediately after saving. A pre-seeded
 * grade on a still-ENROLLED enrollment (inserted directly via SQL,
 * bypassing that service method) *can* still show a "Current Grade" on
 * a visible row — expectCurrentGrade is for asserting that case, not for
 * re-checking a student right after grading them here.
 */
export class ProfessorGradingPage extends BasePage {
  studentRow(lastName: string): Locator {
    return this.row(lastName);
  }

  async gradeStudent(lastName: string, grade: number) {
    const row = this.studentRow(lastName);
    await row.getByRole('spinbutton').fill(String(grade));
    await row.getByRole('button', { name: 'Save' }).click();
  }

  async expectCurrentGrade(lastName: string, grade: number) {
    await expect(this.studentRow(lastName)).toContainText(String(grade));
  }

  async expectNotInRoster(lastName: string) {
    await expect(this.studentRow(lastName)).toHaveCount(0);
  }
}
