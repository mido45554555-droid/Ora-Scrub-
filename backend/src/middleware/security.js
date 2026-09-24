import { isIP } from 'node:net';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { config } from '../config.js';
import { HttpError } from '../lib/httpError.js';
import { safeEqual } from '../lib/secrets.js';
import { findSession } from '../services/adminService.js';
import { mintDeviceToken, readDeviceToken } from '../lib/deviceToken.js';

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

/**
 * Identifies the browser behind the request from the signed token the
 * site keeps in a cookie, minting a fresh one when it is missing or
 * invalid. The new token goes back in the X-Device-Token response
 * header; the site stores it in an httpOnly cookie (see the proxy route
 * in frontend/app/api/order/route.ts).
 */
export function attachDevice(req, res, next) {
  const provided = req.get('x-device-token');
  const known = readDeviceToken(provided);

  if (known) {
    req.deviceId = known;
  } else {
    const token = mintDeviceToken();
    req.deviceId = readDeviceToken(token);
    res.set('x-device-token', token);
    // A brand-new device gets its own budget, so a customer whose
    // cookie was cleared is never punished for someone else's traffic.
  }

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

/**
 * The three layers an order passes through, outermost last:
 *   1. this browser  — the tight, human-sized limit (signed cookie)
 *   2. this address  — looser: whole mobile networks share one address,
 *                      so this stops a single machine hammering the
 *                      site rather than rationing customers
 *   3. everyone      — a backstop so a flood of forged devices/IPs
 *                      still cannot swamp the shop
 *
 * Limits are arguments rather than constants so tests can build an app
 * with small numbers without throttling the rest of the suite.
 */
export function makeOrderLimiters({
  perDevice = config.orderRateLimit,
  perIp = config.orderIpRateLimit,
  overall = config.orderGlobalRateLimit,
  windowMs = 15 * 60 * 1000,
} = {}) {
  const deny = (message) => (_req, _res, next) => next(new HttpError(429, 'RATE_LIMITED', message));

  return [
    rateLimit({
      windowMs,
      limit: perDevice,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: (req) => 'device:' + (req.deviceId ?? 'unknown'),
      handler: deny('Too many orders submitted. Please try again later.'),
    }),
    rateLimit({
      windowMs,
      limit: perIp,
      standardHeaders: false,
      legacyHeaders: false,
      keyGenerator: (req) => ipKeyGenerator(req.clientIp ?? 'unknown'),
      handler: deny('Too many orders from your network. Please try again later.'),
    }),
    rateLimit({
      windowMs,
      limit: overall,
      standardHeaders: false,
      legacyHeaders: false,
      keyGenerator: () => 'all-orders',
      handler: deny('We are receiving too many orders right now. Please try again shortly.'),
    }),
  ];
}

export const orderSubmissionLimiter = makeOrderLimiters();

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
