import { test, expect } from '../../fixtures';
import { primaryUsers, courseId, enrollmentId } from '../../utils/test-data';
import { loginViaApi } from '../../utils/api-client';

test.describe('Grades API', () => {
  // GradeRestController guards both endpoints with hasRole('ADMINISTRATOR') —
  // a role that doesn't exist in the app (UserRole is STUDENT/PROFESSOR/ADMIN),
  // so it can never match directly. That typo looks like it should 403 an
  // admin's JWT, but SecurityConfig's roleHierarchy() declares
  // "ROLE_ADMIN > ROLE_PROFESSOR", and both endpoints also accept
  // hasRole('PROFESSOR') — which an admin satisfies via that hierarchy. So in
  // practice an admin JWT passes both endpoints anyway. Confirmed directly
  // against the running app (curl) before writing this test, since the
  // typo alone would suggest the opposite.
  test('an admin JWT can use both grade endpoints despite the ADMINISTRATOR role typo', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, primaryUsers.admin.username, primaryUsers.admin.password);
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Idempotent: GradeService.assignGrade() upserts by enrollmentId, so
    // rerunning this against the same seeded enrollment is always safe.
    const postResponse = await request.post(
      `/api/grades?enrollmentId=${enrollmentId.sivanovicHist101}&gradeValue=5`,
      { headers }
    );
    expect(postResponse.status()).toBe(201);
    const posted = await postResponse.json();
    expect(posted.success).toBe(true);

    const getResponse = await request.get(`/api/grades?courseId=${courseId.hist101}`, { headers });
    expect(getResponse.status()).toBe(200);
    const fetched = await getResponse.json();
    expect(fetched.success).toBe(true);
  });
});
