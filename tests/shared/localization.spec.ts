import { test, expect } from '../../fixtures';
import { primaryUsers, type SeedUser } from '../../utils/test-data';

// The language dropdown lives in the shared navbar every authenticated role
// sees, and Spring's SessionLocaleResolver keys locale off the HTTP session
// (JSESSIONID), not the request. Every other spec in this suite reuses one
// shared, per-role storageState file (tests/auth.setup.ts saves it once),
// which is safe as long as nothing mutates session-scoped state — but
// switching language IS a session mutation, and two tests (or even two
// parallel repeats of the same test) sharing that file share the literal
// same server-side session, so one's language switch leaks into whatever
// the other reads next. Confirmed for real while building this file:
// reusing authStatePath('student') caused a genuine race, caught via a
// screenshot showing German where Croatian was expected mid-test — and it
// wasn't limited to these tests racing each other, it could just as easily
// have corrupted any other concurrent student-role test's English-text
// assertions elsewhere in the suite. Every test below logs in fresh
// instead, trading the "no test re-does the login flow" convenience
// (Outcome 4 min) for the one case where reusing shared state would be
// actively unsafe rather than just wasteful.
const roleCases: { user: SeedUser; firstName: string }[] = [
  { user: primaryUsers.admin, firstName: 'Admin' },
  { user: primaryUsers.professor, firstName: 'Milica' },
  { user: primaryUsers.student, firstName: 'Sara' },
];

for (const { user, firstName } of roleCases) {
  test.describe(`Language switching — ${user.role}`, () => {
    test(`${user.role} sees the dashboard translated in all 3 supported languages`, async ({
      page,
      loginPage,
      dashboardPage,
    }) => {
      await test.step('Log in with a session no other test shares', async () => {
        await loginPage.goto();
        await loginPage.login(user.username, user.password);
        await loginPage.expectLoggedIn();
      });

      await test.step('Defaults to English', async () => {
        await dashboardPage.goto();
        await expect(page.getByText(`Welcome, ${firstName}!`)).toBeVisible();
      });

      await test.step('Switches to Croatian', async () => {
        await dashboardPage.switchLanguage('hr');
        await expect(page.getByText(`Dobro došao, ${firstName}!`)).toBeVisible();
      });

      await test.step('Switches to German', async () => {
        await dashboardPage.switchLanguage('de');
        await expect(page.getByText(`Willkommen, ${firstName}!`)).toBeVisible();
      });
    });
  });
}

test.describe('Language persistence', () => {
  test('locale persists across navigation without a ?lang= param', async ({
    page,
    loginPage,
    dashboardPage,
    studentCoursesPage,
  }) => {
    await test.step('Log in with a session no other test shares', async () => {
      await loginPage.goto();
      await loginPage.login(primaryUsers.student.username, primaryUsers.student.password);
      await loginPage.expectLoggedIn();
    });

    await test.step('Switch to Croatian on the dashboard', async () => {
      await dashboardPage.goto();
      await dashboardPage.switchLanguage('hr');
      await expect(page.getByRole('heading', { name: 'Studentski portal' })).toBeVisible();
    });

    await test.step('Navigate to a different page with no ?lang= param', async () => {
      await studentCoursesPage.goto();
    });

    await test.step('Confirm it is still rendered in Croatian', async () => {
      // nav.courses = "Kolegiji" in messages_hr.properties
      await expect(page.getByRole('link', { name: 'Kolegiji' })).toBeVisible();
    });
  });
});
