import type { Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

/** /professor/courses — courses taught by the logged-in professor. */
export class ProfessorCoursesPage extends BasePage {
  async goto() {
    await this.page.goto('/professor/courses');
  }

  courseRow(courseNameOrCode: string): Locator {
    return this.row(courseNameOrCode);
  }

  async manageStudents(courseNameOrCode: string) {
    await this.courseRow(courseNameOrCode).locator('[data-testid^="manage-students-course-"]').click();
  }
}