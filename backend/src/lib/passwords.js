import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// scrypt, memory-hard, from Node's built-in crypto (no native addon to
// compile). N=2^16, r=8, p=1 uses 64 MiB per hash — slow enough to make
// offline guessing expensive, fast enough for an occasional admin login.
const PARAMS = { N: 2 ** 16, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEMORY = 128 * 1024 * 1024;

/** Stored format: scrypt$N$r$p$<salt base64>$<hash base64> */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEMORY });
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEMORY,
  });
  return timingSafeEqual(actual, expected);
}

// Verified against when a username doesn't exist, so a login attempt
// takes the same time either way and can't be used to discover which
// usernames are real.
let dummyHash;
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(password, dummyHash);
  return false;
}
