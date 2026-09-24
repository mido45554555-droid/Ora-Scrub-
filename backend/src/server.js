import { config } from './config.js';
import { pool } from './db.js';
import { createApp } from './app.js';
import { ensureStorageDir } from './services/fileStorage.js';
import { ensureTempDir } from './middleware/upload.js';
import { startNotificationWorker, stopNotificationWorker } from './services/notifier.js';

async function main() {
  await ensureStorageDir();
  await ensureTempDir();

  try {
    await pool.query('SELECT 1 FROM orders LIMIT 1');
  } catch (error) {
    console.error(
      `Cannot use the database "${config.db.database}" as "${config.db.user}" (${error.code ?? error.message}).\n` +
        'Is MariaDB/MySQL running? Have you run `npm run setup`?'
    );
    process.exit(1);
  }

  const server = createApp().listen(config.port, config.host, () => {
    console.log(`ORA backend listening on http://${config.host}:${config.port} (${config.env})`);
  });
  startNotificationWorker();

  // Uploads can take a while on slow mobile connections, but a stalled
  // client shouldn't hold a connection forever.
  server.requestTimeout = 120_000;
  server.headersTimeout = 30_000;

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down…`);
    stopNotificationWorker();
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
