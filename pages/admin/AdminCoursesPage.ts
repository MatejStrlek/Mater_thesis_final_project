import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface CourseFormData {
  courseCode: string;
  courseName: string;
  credits: number;
  description?: string;
  maxStudents?: number;
  semester?: 'WINTER' | 'SUMMER';
  academicYear?: string;
  professorFullName?: string;
}

/** /admin/courses — list, create, edit, delete. */
export class AdminCoursesPage extends BasePage {
  async goto() {
    await this.page.goto('/admin/courses');
  }

  async gotoCreate() {
    await this.page.getByTestId('create-course-button').click();
  }

  courseRow(courseCode: string): Locator {
    return this.row(courseCode);
  }

  private async fillForm(data: Partial<CourseFormData>) {
    if (data.courseCode) await this.page.getByLabel('Course Code').fill(data.courseCode);
    if (data.credits !== undefined) await this.page.getByLabel('Credits').fill(String(data.credits));
    if (data.courseName) await this.page.getByLabel('Course Name').fill(data.courseName);
    if (data.description) await this.page.getByLabel('Description').fill(data.description);
    if (data.maxStudents !== undefined) await this.page.getByLabel('Max Students').fill(String(data.maxStudents));
    if (data.semester) await this.page.getByLabel('Semester').selectOption(data.semester);
    if (data.academicYear) await this.page.getByLabel('Academic Year').fill(data.academicYear);
    if (data.professorFullName) {
      await this.page.getByLabel('Assign Professor').selectOption({ label: data.professorFullName });
    }
  }

  async createCourse(data: CourseFormData) {
    await this.gotoCreate();
    await this.fillForm(data);
    await this.page.getByTestId('course-form-submit').click();
  }

  /**
   * The row itself is still found by course code (data, not a label — not
   * i18n-sensitive), but "Edit" is: `[data-testid^="edit-course-"]` matches
   * the row's edit link without needing its numeric course id, which isn't
   * known to callers passing a course code.
   */
  async editCourse(courseCode: string, data: Partial<CourseFormData>) {
    await this.courseRow(courseCode).locator('[data-testid^="edit-course-"]').click();
    await this.fillForm(data);
    await this.page.getByTestId('course-form-submit').click();
  }

  async deleteCourse(courseCode: string) {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.courseRow(courseCode).locator('[data-testid^="delete-course-"]').click();
  }

  async expectCourseVisible(courseCode: string) {
    await expect(this.courseRow(courseCode)).toBeVisible();
  }

  async expectCourseHidden(courseCode: string) {
    await expect(this.courseRow(courseCode)).toHaveCount(0);
  }
}