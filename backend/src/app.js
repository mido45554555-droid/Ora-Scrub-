import express from 'express';
import helmet from 'helmet';
import { pool } from './db.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { attachDevice, healthLimiter, noStore, orderSubmissionLimiter, requireInternalKey } from './middleware/security.js';
import { adminRouter } from './routes/admin.js';
import { ordersRouter } from './routes/orders.js';

/** @param {{ orderLimiters?: import('express').RequestHandler[] }} [options] */
export function createApp(options = {}) {
  const app = express();

  // Only the Next.js proxy talks to this server, and it passes the real
  // client IP in X-Client-IP (see requireInternalKey) — so X-Forwarded-For
  // is deliberately NOT trusted.
  app.set('trust proxy', false);
  app.set('query parser', 'simple');

  app.use(helmet());
  app.use(noStore);

  // Unauthenticated liveness check; reveals nothing beyond up/down.
  // The database answer is cached briefly and the route is rate limited,
  // so hammering this endpoint can't be turned into database load.
  let health = { checkedAt: 0, ok: false };
  const HEALTH_TTL_MS = 5000;

  app.get('/api/health', healthLimiter, async (_req, res) => {
    if (Date.now() - health.checkedAt > HEALTH_TTL_MS) {
      try {
        await pool.query('SELECT 1');
        health = { checkedAt: Date.now(), ok: true };
      } catch {
        health = { checkedAt: Date.now(), ok: false };
      }
    }
    res.status(health.ok ? 200 : 503).json({ status: health.ok ? 'ok' : 'unavailable' });
  });

  app.use('/api', requireInternalKey);
  app.use('/api/orders', attachDevice, options.orderLimiters ?? orderSubmissionLimiter, ordersRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
