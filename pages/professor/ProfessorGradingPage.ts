import { expect, type Download, type Locator } from '@playwright/test';
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

  async expectCurrentGrade(lastName: string, grade: number) {
    await expect(this.studentRow(lastName)).toContainText(String(grade));
  }

  async expectNotInRoster(lastName: string) {
    await expect(this.studentRow(lastName)).toHaveCount(0);
  }

  /**
   * Grades whichever student currently appears first in the active roster
   * and returns their last name, rather than hardcoding a specific seeded
   * student — grading completes (and removes) whoever gets graded, so a
   * hardcoded name isn't repeatable across multiple runs against the same
   * long-lived container without a restart (see CLAUDE.md's known quirks).
   */
  async gradeFirstAvailableStudent(grade: number): Promise<string> {
    const firstRow = this.page.getByRole('rowgroup').nth(1).getByRole('row').first();
    // `strong` isolates the last name within the cell; no ARIA role
    // distinguishes last name from first name inside the same table cell.
    const lastName = await firstRow.locator('strong').innerText();
    await firstRow.getByRole('spinbutton').fill(String(grade));
    await firstRow.getByRole('button', { name: 'Save' }).click();
    return lastName;
  }

  async exportCsv(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByRole('link', { name: 'Export CSV' }).click();
    return downloadPromise;
  }
}
