import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSmtpTransport } from '../src/services/smtpTransport.js';

test('SMTP transport passes provider options and the complete email payload', async () => {
  let transportOptions;
  let sentMessage;
  let closed = false;
  const transport = createSmtpTransport(
    {
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      user: 'test-user',
      password: 'test-password',
    },
    (options) => {
      transportOptions = options;
      return {
        async sendMail(message) {
          sentMessage = message;
          return { messageId: 'smtp-message-id', response: '250 accepted' };
        },
        close() {
          closed = true;
        },
      };
    }
  );
  const message = {
    from: 'ORA Orders <orders@example.test>',
    to: ['shop@example.test'],
    subject: 'Order notification',
    text: 'Order details',
    attachments: [{ filename: 'payment.png', content: Buffer.from('image') }],
  };

  const result = await transport.sendMail(message);

  assert.deepEqual(transportOptions, {
    host: 'smtp.example.test',
    port: 465,
    secure: true,
    auth: { user: 'test-user', pass: 'test-password' },
  });
  assert.equal(sentMessage, message);
  assert.deepEqual(result, { messageId: 'smtp-message-id', response: '250 accepted' });
  transport.close();
  assert.equal(closed, true);
});

test('SMTP transport propagates delivery failures for notifier retries', async () => {
  const transport = createSmtpTransport(
    { host: 'smtp.example.test', port: 587, secure: false, user: 'test-user', password: 'test-password' },
    () => ({
      async sendMail() {
        throw new Error('SMTP unavailable');
      },
      close() {},
    })
  );

  await assert.rejects(
    transport.sendMail({ from: 'orders@example.test', to: ['shop@example.test'], subject: 'Test', text: 'Test' }),
    /SMTP unavailable/
  );
});
