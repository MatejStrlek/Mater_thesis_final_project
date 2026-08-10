import type { Result } from 'axe-core';

/**
 * Rule IDs accepted with reasoning rather than fixed, across the pages this
 * suite scans with axe. Each entry is a real, judged trade-off — see
 * README.md's "Accessibility Findings" section for the full write-up on
 * what automated scanning does and doesn't guarantee here. Two of the four
 * (html-has-lang, color-contrast) were reported to the app's maintainer, who
 * chose to leave them as-is; the other two (the landmark pair and the
 * heading-level one) were never reported — judged out of scope outright,
 * since fixing them means restructuring every template's layout.
 */
const acceptedViolationIds = new Set([
  // App-wide layout gap: no template wraps its content in a <main> element,
  // so every scanned page fails both of these together. Fixing it properly
  // means touching every template's layout, out of scope for a test suite
  // that doesn't own the app's source.
  'landmark-one-main',
  'region',
  // Pages use <h2>/<h3> for their primary heading instead of an <h1>. The
  // heading text itself is still present and meaningful to assistive tech
  // (e.g. "User Management", "My Schedule") — cosmetic heading-level choice,
  // not a loss of information.
  'page-has-heading-one',
  // login.html's <html> has no lang attribute (axe: "serious").
  'html-has-lang',
  // Navbar link color contrast on /admin/users — Bootstrap's default
  // navbar-dark .nav-link opacity (55% white) over bg-primary blue computes
  // to a 2.36:1 ratio, below the 4.5:1 WCAG AA minimum (axe: "serious").
  'color-contrast',
]);

/** Violations axe found that aren't in the accepted list above. */
export function unexpectedViolations(violations: Result[]): Result[] {
  return violations.filter((v) => !acceptedViolationIds.has(v.id));
}
