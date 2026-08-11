import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AdminCoursesPage } from '../pages/admin/AdminCoursesPage';
import { AdminSchedulePage } from '../pages/admin/AdminSchedulePage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminCourseContentPage } from '../pages/admin/AdminCourseContentPage';
import { ProfessorCoursesPage } from '../pages/professor/ProfessorCoursesPage';
import { ProfessorGradingPage } from '../pages/professor/ProfessorGradingPage';
import { ProfessorCourseContentPage } from '../pages/professor/ProfessorCourseContentPage';
import { StudentCoursesPage } from '../pages/student/StudentCoursesPage';
import { StudentEnrollmentsPage } from '../pages/student/StudentEnrollmentsPage';
import { StudentCourseContentPage } from '../pages/student/StudentCourseContentPage';

/**
 * Merges every Page Object into one custom `test`, so specs and
 * tests/auth.setup.ts request them by name instead of constructing
 * `new SomePage(page)` inline. Grows as more Page Objects are added.
 */
type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  adminCoursesPage: AdminCoursesPage;
  adminSchedulePage: AdminSchedulePage;
  adminUsersPage: AdminUsersPage;
  adminCourseContentPage: AdminCourseContentPage;
  professorCoursesPage: ProfessorCoursesPage;
  professorGradingPage: ProfessorGradingPage;
  professorCourseContentPage: ProfessorCourseContentPage;
  studentCoursesPage: StudentCoursesPage;
  studentEnrollmentsPage: StudentEnrollmentsPage;
  studentCourseContentPage: StudentCourseContentPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  adminCoursesPage: async ({ page }, use) => {
    await use(new AdminCoursesPage(page));
  },
  adminSchedulePage: async ({ page }, use) => {
    await use(new AdminSchedulePage(page));
  },
  adminUsersPage: async ({ page }, use) => {
    await use(new AdminUsersPage(page));
  },
  adminCourseContentPage: async ({ page }, use) => {
    await use(new AdminCourseContentPage(page));
  },
  professorCoursesPage: async ({ page }, use) => {
    await use(new ProfessorCoursesPage(page));
  },
  professorGradingPage: async ({ page }, use) => {
    await use(new ProfessorGradingPage(page));
  },
  professorCourseContentPage: async ({ page }, use) => {
    await use(new ProfessorCourseContentPage(page));
  },
  studentCoursesPage: async ({ page }, use) => {
    await use(new StudentCoursesPage(page));
  },
  studentEnrollmentsPage: async ({ page }, use) => {
    await use(new StudentEnrollmentsPage(page));
  },
  studentCourseContentPage: async ({ page }, use) => {
    await use(new StudentCourseContentPage(page));
  },
});

export { expect } from '@playwright/test';