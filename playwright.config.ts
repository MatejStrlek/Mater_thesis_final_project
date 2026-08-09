import { defineConfig, devices } from '@playwright/test';

/**
 * Target app: uni_course_management, run via `docker run` (see CLAUDE.md).
 * BASE_URL is read from the environment so the same suite can point at a
 * different environment without editing this file (final project spec,
 * Outcome 4: environment configuration).
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:8081';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  /**
   * One project per role instead of per browser: `admin`/`professor`/`student`
   * each depend on `setup` (which logs in as all three roles once and saves
   * storageState per role), so specs never re-do the login UI flow to reach
   * an authenticated page. `public` covers unauthenticated flows (login page
   * itself, redirects). `api` covers the JWT REST layer directly and manages
   * its own bearer tokens per test, so it needs no storageState.
   */
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'public',
      testMatch: 'public/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin',
      testMatch: 'admin/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup'],
    },
    {
      name: 'professor',
      testMatch: 'professor/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/professor.json' },
      dependencies: ['setup'],
    },
    {
      name: 'student',
      testMatch: 'student/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/student.json' },
      dependencies: ['setup'],
    },
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
