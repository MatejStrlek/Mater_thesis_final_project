import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AdminCoursesPage } from '../pages/admin/AdminCoursesPage';
import { ProfessorCoursesPage } from '../pages/professor/ProfessorCoursesPage';
import { ProfessorGradingPage } from '../pages/professor/ProfessorGradingPage';
import { StudentCoursesPage } from '../pages/student/StudentCoursesPage';
import { StudentEnrollmentsPage } from '../pages/student/StudentEnrollmentsPage';

/**
 * Merges every Page Object into one custom `test`, so specs and
 * tests/auth.setup.ts request them by name instead of constructing
 * `new SomePage(page)` inline. Grows as more Page Objects are added.
 */
type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  adminCoursesPage: AdminCoursesPage;
  professorCoursesPage: ProfessorCoursesPage;
  professorGradingPage: ProfessorGradingPage;
  studentCoursesPage: StudentCoursesPage;
  studentEnrollmentsPage: StudentEnrollmentsPage;
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
  professorCoursesPage: async ({ page }, use) => {
    await use(new ProfessorCoursesPage(page));
  },
  professorGradingPage: async ({ page }, use) => {
    await use(new ProfessorGradingPage(page));
  },
  studentCoursesPage: async ({ page }, use) => {
    await use(new StudentCoursesPage(page));
  },
  studentEnrollmentsPage: async ({ page }, use) => {
    await use(new StudentEnrollmentsPage(page));
  },
});

export { expect } from '@playwright/test';