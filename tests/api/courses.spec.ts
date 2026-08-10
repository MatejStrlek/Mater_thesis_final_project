import { test, expect } from '../../fixtures';
import { primaryUsers, course, courseId } from '../../utils/test-data';
import { apiAuthHeaders } from '../../utils/api-client';

test.describe('Courses API', () => {
  test('lists all seeded courses for an authenticated user', async ({ request }) => {
    // GET /api/courses accepts any authenticated role, not just the owning professor.
    const headers = await apiAuthHeaders(request, primaryUsers.professor.username, primaryUsers.professor.password);

    const response = await request.get('/api/courses', { headers });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.map((c: { courseCode: string }) => c.courseCode)).toContain(course.cs101);
  });

  test('GET /api/courses/{id} returns a single course', async ({ request }) => {
    const headers = await apiAuthHeaders(request, primaryUsers.student.username, primaryUsers.student.password);

    const response = await request.get(`/api/courses/${courseId.cs101}`, { headers });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.courseCode).toBe(course.cs101);
  });
});
