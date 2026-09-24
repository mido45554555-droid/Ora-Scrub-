import { isIP } from 'node:net';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { config } from '../config.js';
import { HttpError } from '../lib/httpError.js';
import { safeEqual } from '../lib/secrets.js';
import { findSession } from '../services/adminService.js';

/**
 * Every /api route except /api/health requires the shared secret that
 * only the Next.js server knows. Combined with listening on 127.0.0.1,
 * this means browsers can only reach the backend through the site's own
 * proxy route.
 *
 * Also works out the real client IP: once the caller has proven it's
 * our proxy, its X-Client-IP header is trusted (it's the only one that
 * can set it). Otherwise the socket address is used.
 */
export function requireInternalKey(req, _res, next) {
  const provided = req.get('x-internal-api-key');
  if (!provided || !safeEqual(provided, config.internalApiKey)) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized.');
  }

  const forwarded = req.get('x-client-ip')?.trim();
  req.clientIp = forwarded && isIP(forwarded) ? forwarded : req.socket.remoteAddress ?? null;
  next();
}

function limiter({ windowMinutes, limit, message }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Groups IPv6 addresses by /56 so one host can't rotate addresses.
    keyGenerator: (req) => ipKeyGenerator(req.clientIp ?? 'unknown'),
    handler: (_req, _res, next) => next(new HttpError(429, 'RATE_LIMITED', message)),
  });
}

const perIpOrderLimiter = limiter({
  windowMinutes: 15,
  limit: config.orderRateLimit,
  message: 'Too many orders submitted. Please try again later.',
});

// Backstop across ALL clients: if someone rotates spoofed IPs to dodge
// the per-IP limit, total intake is still capped. Set far above what a
// real shop receives in 15 minutes.
const globalOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.orderGlobalRateLimit,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: () => 'all-orders',
  handler: (_req, _res, next) =>
    next(new HttpError(429, 'RATE_LIMITED', 'We are receiving too many orders right now. Please try again shortly.')),
});

export const orderSubmissionLimiter = [perIpOrderLimiter, globalOrderLimiter];

export const loginLimiter = limiter({
  windowMinutes: 15,
  limit: 10,
  message: 'Too many login attempts. Please try again later.',
});

// Public and unauthenticated, so it is keyed by socket address rather
// than the proxy-supplied client IP.
export const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ status: 'rate_limited' }),
});

export const adminLimiter = limiter({
  windowMinutes: 15,
  limit: 600,
  message: 'Too many requests. Please slow down.',
});

/**
 * Caps how many uploads stream to disk at the same time.
 *
 * Uploads are streamed to temp files (see middleware/upload.js), so
 * memory no longer grows with them and this cap is only about bounding
 * disk I/O and open file handles — hence a generous default. Requests
 * over the cap get 503 + Retry-After immediately, which keeps the
 * customer's filled-in form intact.
 */
export function limitConcurrentUploads(max) {
  let inFlight = 0;

  return (_req, res, next) => {
    if (inFlight >= max) {
      res.set('Retry-After', '10');
      next(new HttpError(503, 'SERVER_BUSY', 'The server is busy right now. Please try again in a moment.'));
      return;
    }

    inFlight += 1;
    let released = false;
    // 'close' covers a finished response and a client that disconnected
    // mid-upload, so a slot is never leaked.
    res.once('close', () => {
      if (!released) {
        released = true;
        inFlight -= 1;
      }
    });
    next();
  };
}

/** Requires `Authorization: Bearer <session token>` from /api/admin/login. */
export async function requireAdmin(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const match = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(header);
  const session = match ? await findSession(match[1]) : null;
  if (!session) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Please log in again.');
  }
  req.admin = session;
  next();
}

/** API responses (customer data, images) must never be cached. */
export function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
