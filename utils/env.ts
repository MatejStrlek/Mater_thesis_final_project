import type { Role } from './test-data';

/**
 * Single source of truth for the target app's URL — read once here so
 * playwright.config.ts and anything else needing it (e.g. utils/api-client.ts)
 * import the same value instead of each reading process.env.BASE_URL with
 * their own fallback (final project spec, Outcome 4: environment config).
 */
export const baseURL = process.env.BASE_URL ?? 'http://localhost:8081';

/** Where tests/auth.setup.ts writes storageState and playwright.config.ts's projects read it from. */
export function authStatePath(role: Role): string {
  return `playwright/.auth/${role}.json`;
}
