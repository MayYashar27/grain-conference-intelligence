/**
 * Pure identity-text comparison used by lead capture to decide whether an
 * incoming name/company differs from the one already stored on a matched
 * Contact (matched by normalized phone). A difference NEVER overwrites the
 * stored value — it raises a lightweight review flag instead (see
 * server/captureLead.ts). Kept dependency-free so it is deterministically
 * testable (scripts/test-contact-identity.ts).
 */

/** Loose equality for identity fields: case-insensitive, whitespace-collapsed. */
export function sameText(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  return norm(a) === norm(b);
}
