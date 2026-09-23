import { createHash, timingSafeEqual } from 'node:crypto';

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** Constant-time string comparison (hashing first equalizes lengths). */
export function safeEqual(a, b) {
  return timingSafeEqual(
    createHash('sha256').update(String(a)).digest(),
    createHash('sha256').update(String(b)).digest()
  );
}
