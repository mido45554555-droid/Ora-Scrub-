import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

/**
 * A signed identifier for one browser, stored by the site in an
 * httpOnly cookie.
 *
 * Why: in Egypt many customers reach the site through the same mobile
 * carrier address, so a per-IP limit either blocks real customers or
 * has to be so loose it stops being useful. A per-device limit gives
 * each browser its own budget, while the IP and global limits stay as
 * the outer defences.
 *
 * It is NOT an identity or a security boundary: anyone can throw the
 * cookie away and get a new one. It only makes normal customers
 * independent of each other, and it is signed so a device id cannot be
 * forged, reused across devices at will, or replayed forever.
 */

const VERSION = 'v1';
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

// Derived from the shared key, so there is no extra secret to configure
// or keep in sync, but the two values are never interchangeable.
function signingKey() {
  return createHmac('sha256', 'ora-device-token').update(config.internalApiKey).digest();
}

function sign(payload) {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

/** @returns {string} token to hand back to the browser */
export function mintDeviceToken(now = Date.now()) {
  const payload = `${VERSION}.${randomUUID()}.${now}`;
  return `${payload}.${sign(payload)}`;
}

/** @returns {string | null} the device id, or null if missing/forged/expired */
export function readDeviceToken(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 300) return null;

  const parts = token.split('.');
  if (parts.length !== 4) return null;

  const [version, id, issuedAt, signature] = parts;
  if (version !== VERSION) return null;

  const expected = sign(`${version}.${id}.${issuedAt}`);
  const given = Buffer.from(signature, 'base64url');
  const want = Buffer.from(expected, 'base64url');
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  const issued = Number(issuedAt);
  if (!Number.isFinite(issued) || issued > now + 60_000 || now - issued > MAX_AGE_MS) return null;

  return id;
}
