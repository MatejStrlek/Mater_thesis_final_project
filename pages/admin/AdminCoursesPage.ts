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
    await this.page.getByRole('link', { name: 'Add New Course' }).click();
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
    await this.page.getByRole('button', { name: 'Create Course' }).click();
  }

  async editCourse(courseCode: string, data: Partial<CourseFormData>) {
    await this.courseRow(courseCode).getByRole('link', { name: 'Edit' }).click();
    await this.fillForm(data);
    await this.page.getByRole('button', { name: 'Update Course' }).click();
  }

  async deleteCourse(courseCode: string) {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.courseRow(courseCode).getByRole('button', { name: 'Delete' }).click();
  }

  async expectCourseVisible(courseCode: string) {
    await expect(this.courseRow(courseCode)).toBeVisible();
  }

  async expectCourseHidden(courseCode: string) {
    await expect(this.courseRow(courseCode)).toHaveCount(0);
  }
}