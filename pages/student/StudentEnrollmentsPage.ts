import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

/** /student/courses/my-courses — the student's active enrollments. */
export class StudentEnrollmentsPage extends BasePage {
  async goto() {
    await this.page.goto('/student/courses/my-courses');
  }

  enrollmentRow(courseCode: string): Locator {
    return this.row(courseCode);
  }

  async drop(courseCode: string) {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.enrollmentRow(courseCode).locator('[data-testid^="drop-enrollment-"]').click();
  }

  async expectEnrolled(courseCode: string) {
    await expect(this.enrollmentRow(courseCode)).toBeVisible();
  }

  async expectNotEnrolled(courseCode: string) {
    await expect(this.enrollmentRow(courseCode)).toHaveCount(0);
  }
}