import { defineConfig, devices } from '@playwright/test';
import { authStatePath, baseURL } from './utils/env';

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
    screenshot: 'only-on-failure',
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
      use: { ...devices['Desktop Chrome'], storageState: authStatePath('admin') },
      dependencies: ['setup'],
    },
    {
      name: 'professor',
      testMatch: 'professor/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], storageState: authStatePath('professor') },
      dependencies: ['setup'],
    },
    {
      name: 'student',
      testMatch: 'student/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], storageState: authStatePath('student') },
      dependencies: ['setup'],
    },
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // For specs that are genuinely role-agnostic (e.g. the language
      // switcher, part of the shared navbar every role sees) rather than
      // belonging to one role's folder. No fixed storageState and no
      // `dependencies: ['setup']` — these specs log in fresh per test
      // instead of reusing a shared storageState file, deliberately: see
      // tests/shared/localization.spec.ts for why sharing a session is
      // unsafe for anything that mutates session-scoped state.
      name: 'shared',
      testMatch: 'shared/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
