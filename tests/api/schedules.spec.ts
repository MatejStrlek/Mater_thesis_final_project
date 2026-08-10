import { test, expect } from '../../fixtures';
import { primaryUsers, courseId } from '../../utils/test-data';
import { apiAuthHeaders } from '../../utils/api-client';

test.describe('Schedules API', () => {
  test('GET /api/courses/{id}/schedule returns entries for a course that has them', async ({ request }) => {
    const headers = await apiAuthHeaders(request, primaryUsers.student.username, primaryUsers.student.password);

    const response = await request.get(`/api/courses/${courseId.cs101}/schedule`, { headers });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/courses/{id}/schedule 404s for a course with none', async ({ request }) => {
    // courses 12-15 have zero seeded schedule entries (docs/API.md).
    const headers = await apiAuthHeaders(request, primaryUsers.student.username, primaryUsers.student.password);

    const response = await request.get(`/api/courses/${courseId.hist201}/schedule`, { headers });
    expect(response.status()).toBe(404);
  });
});
