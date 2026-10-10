import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const configUrl = new URL('../src/config.js', import.meta.url).href;

function loadConfigWith(env) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `await import(${JSON.stringify(configUrl)})`],
    {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH ?? '',
        SystemRoot: process.env.SystemRoot ?? '',
        NODE_ENV: 'test',
        DB_NAME: 'ora_scrubs_test',
        DB_USER: 'test',
        INTERNAL_API_KEY: 'test-key-that-is-long-enough-for-validation',
        SMTP_HOST: '',
        SMTP_PORT: '',
        SMTP_USER: '',
        SMTP_PASS: '',
        SMTP_PASSWORD: '',
        SMTP_SECURE: '',
        MAIL_FROM: '',
        ORDER_NOTIFY_TO: '',
        RESEND_API_KEY: '',
        ...env,
      },
    }
  );
  return `${result.stdout}${result.stderr}`;
}

test('partial SMTP configuration fails validation instead of selecting Resend', () => {
  const output = loadConfigWith({
    SMTP_HOST: 'smtp.example.test',
    MAIL_FROM: 'orders@example.test',
    ORDER_NOTIFY_TO: 'shop@example.test',
    RESEND_API_KEY: 'test-resend-key',
  });

  assert.match(output, /SMTP email configuration requires/);
  assert.doesNotMatch(output, /test-resend-key/);
});

test('conflicting non-empty SMTP password variables fail validation without exposing either value', () => {
  const output = loadConfigWith({
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '587',
    SMTP_USER: 'test-user',
    SMTP_PASS: 'smtp-pass-test-value',
    SMTP_PASSWORD: 'smtp-password-test-value',
    MAIL_FROM: 'orders@example.test',
    ORDER_NOTIFY_TO: 'shop@example.test',
  });

  assert.match(output, /Set only one SMTP password value/);
  assert.doesNotMatch(output, /smtp-pass-test-value|smtp-password-test-value/);
});
