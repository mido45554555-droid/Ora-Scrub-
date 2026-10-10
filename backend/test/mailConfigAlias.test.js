import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'ora_scrubs_test';
process.env.DB_USER = 'test';
process.env.INTERNAL_API_KEY = 'test-key-that-is-long-enough-for-validation';
process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_PORT = '465';
process.env.SMTP_USER = 'test-user';
process.env.SMTP_PASS = '';
process.env.SMTP_PASSWORD = 'test-password';
process.env.SMTP_SECURE = '';
process.env.MAIL_FROM = 'ORA Orders <orders@example.test>';
process.env.ORDER_NOTIFY_TO = 'shop@example.test';
process.env.RESEND_API_KEY = '';

const { config } = await import('../src/config.js');

test('SMTP_PASSWORD alias is accepted and port 465 defaults to secure SMTP', () => {
  assert.equal(config.mail.provider, 'smtp');
  assert.deepEqual(config.mail.smtp, {
    host: 'smtp.example.test',
    port: 465,
    secure: true,
    user: 'test-user',
    password: 'test-password',
  });
});
