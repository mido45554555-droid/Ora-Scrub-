import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResendTransport } from '../src/services/resendTransport.js';

function fakeResend(send) {
  const requests = [];
  return {
    requests,
    client: {
      emails: {
        async send(message) {
          requests.push(message);
          return send(message);
        },
      },
    },
  };
}

test('Resend transport sends the original email payload and maps attachments', async () => {
  const imagePath = path.resolve('storage', 'order', 'image.png');
  const fake = fakeResend(async () => ({ data: { id: 'resend-email-id' }, error: null }));
  const transport = createResendTransport('test-api-key', fake.client);

  const result = await transport.sendMail({
    from: 'ORA Orders <orders@example.test>',
    to: ['shop@example.test'],
    subject: 'Order notification',
    text: 'Original plain text',
    html: '<p>Original HTML</p>',
    attachments: [
      { filename: 'logo.png', path: imagePath, cid: 'ora-logo' },
      { filename: 'payment.png', content: imagePath, contentType: 'image/png' },
      { filename: 'small.txt', content: Buffer.from('attachment bytes') },
    ],
  });

  assert.deepEqual(fake.requests[0], {
    from: 'ORA Orders <orders@example.test>',
    to: ['shop@example.test'],
    subject: 'Order notification',
    text: 'Original plain text',
    html: '<p>Original HTML</p>',
    attachments: [
      { filename: 'logo.png', path: imagePath, content_id: 'ora-logo' },
      { filename: 'payment.png', path: imagePath, content_type: 'image/png' },
      { filename: 'small.txt', content: Buffer.from('attachment bytes') },
    ],
  });
  assert.equal(result.messageId, 'resend-email-id');
});

test('Resend transport propagates provider errors for notification retries', async () => {
  const fake = fakeResend(async () => ({
    data: null,
    error: { statusCode: 403, message: 'Domain is not verified' },
  }));
  const transport = createResendTransport('test-api-key', fake.client);

  await assert.rejects(
    transport.sendMail({ from: 'orders@example.test', to: ['shop@example.test'], subject: 'Test', text: 'Test' }),
    /Resend API request failed \(403\): Domain is not verified/
  );
});

test('Resend transport rejects a success response without an email ID', async () => {
  const fake = fakeResend(async () => ({ data: {}, error: null }));
  const transport = createResendTransport('test-api-key', fake.client);

  await assert.rejects(
    transport.sendMail({ from: 'orders@example.test', to: ['shop@example.test'], subject: 'Test', text: 'Test' }),
    /Resend API response did not include an email ID/
  );
});

test('Resend client initialization is deferred until an email is sent', async () => {
  const transport = createResendTransport('');

  await assert.rejects(
    transport.sendMail({ from: 'orders@example.test', to: ['shop@example.test'], subject: 'Test', text: 'Test' }),
    /Missing API key/
  );
});
