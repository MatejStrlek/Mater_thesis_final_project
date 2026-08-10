import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { baseURL } from './env';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  role: string;
}

/**
 * A freshly-isolated API request context, deliberately not the `request`
 * fixture a spec gets injected. Use this for specs that are purely
 * API-level (no `page` fixture live in the same test) — see CLAUDE.md's
 * "known quirks" #5 for why: an isolated context making a mutating API
 * call while a *different* project's browser `page` is live in the same
 * test reliably broke that page's session, for reasons never fully
 * root-caused (ruled out shared storageState/cookies, server-side session
 * invalidation, and stale storageState files). Not proven safe to combine
 * with a live `page` from another role — don't assume this function fixes
 * that combination, it was tried and didn't reliably help.
 */
export async function newApiContext(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL });
}

export async function loginViaApi(
  api: APIRequestContext,
  username: string,
  password: string,
): Promise<LoginResult> {
  const response = await api.post('/api/auth/login', { data: { username, password } });
  const body = (await response.json()) as { data: LoginResult };
  return body.data;
}

/**
 * Logs in and returns a ready-to-spread Authorization header, for the
 * common case of a test that only needs to *act as* a role rather than
 * inspect the login response itself (that's what loginViaApi is still for
 * — see tests/api/auth.spec.ts). Introduced in Phase 7 to de-duplicate the
 * `const { accessToken } = await loginViaApi(...); const headers = {
 * Authorization: \`Bearer ${accessToken}\` }` pair repeated across the
 * other API specs.
 */
export async function apiAuthHeaders(
  api: APIRequestContext,
  username: string,
  password: string,
): Promise<{ Authorization: string }> {
  const { accessToken } = await loginViaApi(api, username, password);
  return { Authorization: `Bearer ${accessToken}` };
}
