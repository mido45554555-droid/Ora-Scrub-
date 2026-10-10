import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'ora_scrubs_test';
process.env.DB_USER = 'test';
process.env.INTERNAL_API_KEY = 'test-key-that-is-long-enough-for-validation';
process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test-user';
process.env.SMTP_PASS = 'test-password';
process.env.SMTP_PASSWORD = '';
process.env.SMTP_SECURE = 'false';
process.env.MAIL_FROM = 'ORA Orders <orders@example.test>';
process.env.ORDER_NOTIFY_TO = 'shop@example.test';
process.env.RESEND_API_KEY = 'test-resend-key';

const { config } = await import('../src/config.js');

test('SMTP is preferred over Resend when both providers are configured', () => {
  assert.equal(config.mail.enabled, true);
  assert.equal(config.mail.provider, 'smtp');
  assert.deepEqual(config.mail.smtp, {
    host: 'smtp.example.test',
    port: 587,
    secure: false,
    user: 'test-user',
    password: 'test-password',
  });
});
