/**
 * Deterministic phone normalization for identity matching. Pure (no imports),
 * so it is shared by the client, the server capture endpoint, and unit tests.
 *
 * Rules — conservative, never invents a country code:
 *  - a leading "+" or international "00" prefix means the number is E.164-style;
 *    we keep a single leading "+" and the digits.
 *  - otherwise we keep just the digits (no country code assumed), so a bare
 *    local number is NOT treated as the same as an international one.
 *  - all spaces, dashes, parentheses and dots are removed.
 *
 * Examples that normalize equal:
 *   "+972 50 123 4567" = "+972-50-123-4567" = "+972501234567" = "00972501234567"
 */
export function normalizePhone(raw: string): string {
  let s = (raw ?? '').trim();
  let international = false;

  if (s.startsWith('+')) {
    international = true;
    s = s.slice(1);
  } else if (s.startsWith('00')) {
    international = true;
    s = s.slice(2);
  }

  const digits = s.replace(/\D/g, '');
  if (!digits) return '';
  return (international ? '+' : '') + digits;
}

/** True when a normalized phone is plausibly usable as an identity key. */
export function isUsablePhone(raw: string): boolean {
  const n = normalizePhone(raw);
  // At least 6 digits (excluding a leading +) to avoid trivial/garbage values.
  return n.replace(/\D/g, '').length >= 6;
}
