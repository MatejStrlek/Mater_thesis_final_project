import type { Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

/** /student/courses — courses available to enroll in. */
export class StudentCoursesPage extends BasePage {
  async goto() {
    await this.page.goto('/student/courses');
  }

  courseRow(courseCode: string): Locator {
    return this.row(courseCode);
  }

  async enroll(courseCode: string) {
    await this.courseRow(courseCode).getByRole('button', { name: 'Enroll' }).click();
  }
}