import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.HOST = '0.0.0.0';
process.env.PORT = '4000';
process.env.DB_NAME = 'ora_scrubs_test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = '';
process.env.INTERNAL_API_KEY = 'test-key-that-is-long-enough-for-validation';
process.env.RESEND_API_KEY = 're_test_startup';
process.env.MAIL_FROM = 'ORA Orders <orders@example.test>';
process.env.ORDER_NOTIFY_TO = 'shop@example.test';

const { config } = await import('../src/config.js');
const { pool } = await import('../src/db.js');
const { startNotificationWorker, stopNotificationWorker } = await import('../src/services/notifier.js');

test('notification worker startup does not query pending orders or call Resend', async (t) => {
  let databaseCalls = 0;
  let networkCalls = 0;
  t.mock.method(pool, 'query', async () => {
    databaseCalls += 1;
    return [[]];
  });
  t.mock.method(globalThis, 'fetch', async () => {
    networkCalls += 1;
    throw new Error('Unexpected external request during startup');
  });

  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.port, 4000);
  startNotificationWorker();

  try {
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(databaseCalls, 0);
    assert.equal(networkCalls, 0);
  } finally {
    stopNotificationWorker();
  }
});
