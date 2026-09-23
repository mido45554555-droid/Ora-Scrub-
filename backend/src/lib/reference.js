import { randomInt } from 'node:crypto';

// Crockford-style alphabet: no I, L, O, U, so references read back over
// the phone or retyped from a screenshot aren't ambiguous.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Order reference like "ORA-260921-7K3M9Q": the UTC date plus 6
 * cryptographically random characters (~1 billion combinations per day).
 * Uniqueness is still enforced by the database; callers retry on the
 * (very unlikely) duplicate.
 */
export function generateOrderReference(now = new Date()) {
  const date = now.toISOString().slice(2, 10).replaceAll('-', '');
  let random = '';
  for (let i = 0; i < 6; i += 1) {
    random += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `ORA-${date}-${random}`;
}
