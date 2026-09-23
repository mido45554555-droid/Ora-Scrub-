import express from 'express';
import helmet from 'helmet';
import { pool } from './db.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { noStore, requireInternalKey } from './middleware/security.js';
import { adminRouter } from './routes/admin.js';
import { ordersRouter } from './routes/orders.js';

export function createApp() {
  const app = express();

  // Only the Next.js proxy talks to this server, and it passes the real
  // client IP in X-Client-IP (see requireInternalKey) — so X-Forwarded-For
  // is deliberately NOT trusted.
  app.set('trust proxy', false);
  app.set('query parser', 'simple');

  app.use(helmet());
  app.use(noStore);

  // Unauthenticated liveness check; reveals nothing beyond up/down.
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.use('/api', requireInternalKey);
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
