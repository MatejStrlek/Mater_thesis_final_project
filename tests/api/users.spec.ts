import { test, expect } from '../../fixtures';
import { primaryUsers } from '../../utils/test-data';
import { apiAuthHeaders } from '../../utils/api-client';

test.describe('Users API', () => {
  test('an admin JWT can list all users', async ({ request }) => {
    const headers = await apiAuthHeaders(request, primaryUsers.admin.username, primaryUsers.admin.password);

    const response = await request.get('/api/users', { headers });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.map((u: { username: string }) => u.username)).toContain(primaryUsers.admin.username);
  });

  test('a student JWT is rejected with 403', async ({ request }) => {
    const headers = await apiAuthHeaders(request, primaryUsers.student.username, primaryUsers.student.password);

    const response = await request.get('/api/users', { headers });
    expect(response.status()).toBe(403);
  });
});
