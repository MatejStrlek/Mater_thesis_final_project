import { test, expect } from '../../fixtures';
import { primaryUsers, courseId, enrollmentId } from '../../utils/test-data';
import { apiAuthHeaders } from '../../utils/api-client';

test.describe('Grades API', () => {
  // Permission-boundary check: an admin JWT can grade and read grades
  // directly via GradeRestController's ADMIN check. (This endpoint used to
  // have an 'ADMINISTRATOR' typo instead of 'ADMIN' — see CLAUDE.md's known
  // quirks for that history — fixed upstream since.)
  test('an admin JWT can use both grade endpoints directly (ADMIN role)', async ({ request }) => {
    const headers = await apiAuthHeaders(request, primaryUsers.admin.username, primaryUsers.admin.password);

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
