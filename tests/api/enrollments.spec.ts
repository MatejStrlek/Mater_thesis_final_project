import { test, expect } from '../../fixtures';
import { primaryUsers, course, courseId } from '../../utils/test-data';
import { loginViaApi } from '../../utils/api-client';

test.describe('Enrollments API', () => {
  test.afterEach(async ({ request }) => {
    // Best-effort safety net: if an assertion above throws before the test's
    // own drop runs, a leftover enrollment would fail this same test on its
    // next run (EnrollmentService rejects enrolling twice into the same
    // course). A redundant drop here is a harmless no-op — request.delete()
    // doesn't throw on a non-2xx response.
    const { accessToken } = await loginViaApi(request, primaryUsers.student.username, primaryUsers.student.password);
    await request.delete(`/api/enrollments/${courseId.math301}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });

  test('enrolls and drops a course entirely through the API, independent of the browser UI', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, primaryUsers.student.username, primaryUsers.student.password);
    const headers = { Authorization: `Bearer ${accessToken}` };

    const enrollResponse = await request.post(`/api/enrollments/${courseId.math301}`, { headers });
    expect(enrollResponse.status()).toBe(201);
    const enrolled = await enrollResponse.json();
    expect(enrolled.data.status).toBe('ENROLLED');
    expect(enrolled.data.course.courseCode).toBe(course.math301);

    const listResponse = await request.get('/api/enrollments', { headers });
    expect(listResponse.status()).toBe(200);
    const list = await listResponse.json();
    expect(list.data.map((e: { course: { courseCode: string } }) => e.course.courseCode)).toContain(course.math301);

    const dropResponse = await request.delete(`/api/enrollments/${courseId.math301}`, { headers });
    expect(dropResponse.status()).toBe(200);

    const listAfterDrop = await request.get('/api/enrollments', { headers });
    const afterDrop = await listAfterDrop.json();
    expect(afterDrop.data.map((e: { course: { courseCode: string } }) => e.course.courseCode)).not.toContain(course.math301);
  });
});
