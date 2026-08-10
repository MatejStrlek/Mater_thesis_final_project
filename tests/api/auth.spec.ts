import { test, expect } from '../../fixtures';
import { primaryUsers } from '../../utils/test-data';
import { loginViaApi } from '../../utils/api-client';

test.describe('Auth API', () => {
  test('authenticates via JWT and fetches the current profile', async ({ request }) => {
    const { accessToken, role } = await loginViaApi(request, primaryUsers.admin.username, primaryUsers.admin.password);
    expect(role).toBe('ADMIN');

    const me = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(me.status()).toBe(200);

    const profile = await me.json();
    expect(profile.username).toBe(primaryUsers.admin.username);
    expect(profile.role).toBe('ADMIN');
  });

  test('rejects a request with no bearer token', async ({ request }) => {
    const response = await request.get('/api/courses');
    expect(response.status()).toBe(401);
  });
});
