import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
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

test('Resend transport reads explicit absolute and relative paths and preserves SDK attachment fields', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'resend-attachments-'));
  try {
    const logoPath = path.join(directory, 'logo.png');
    const paymentPath = path.join(directory, 'payment');
    const logoBytes = Buffer.from('logo bytes');
    const paymentBytes = Buffer.from('payment bytes');
    const memoryBytes = Buffer.from('attachment bytes');
    await writeFile(logoPath, logoBytes);
    await writeFile(paymentPath, paymentBytes);
    const relativePaymentPath = path.relative(process.cwd(), paymentPath);

    const fake = fakeResend(async () => ({ data: { id: 'resend-email-id' }, error: null }));
    const transport = createResendTransport('test-api-key', fake.client);

    const result = await transport.sendMail({
      from: 'ORA Orders <orders@example.test>',
      to: ['shop@example.test'],
      subject: 'Order notification',
      text: 'Original plain text',
      html: '<p>Original HTML</p>',
      attachments: [
        { filename: 'logo.png', path: logoPath, cid: 'ora-logo', contentType: 'image/png' },
        { filename: 'payment.png', path: relativePaymentPath, contentType: 'image/png' },
        { filename: 'small.txt', content: memoryBytes },
        { filename: 'base64.txt', content: 'aGVs/bG8=', contentType: 'text/plain', contentId: 'memory-cid' },
        { filename: 'report.png', content: 'This is ordinary string content named report.png' },
        { filename: 'extensionless.txt', content: 'storage/order/file' },
        { filename: 'remote.png', path: 'https://cdn.example.test/image.png' },
      ],
    });

    assert.deepEqual(fake.requests[0], {
      from: 'ORA Orders <orders@example.test>',
      to: ['shop@example.test'],
      subject: 'Order notification',
      text: 'Original plain text',
      html: '<p>Original HTML</p>',
      attachments: [
        { filename: 'logo.png', content: logoBytes, contentType: 'image/png', contentId: 'ora-logo' },
        { filename: 'payment.png', content: paymentBytes, contentType: 'image/png' },
        { filename: 'small.txt', content: memoryBytes },
        { filename: 'base64.txt', content: 'aGVs/bG8=', contentType: 'text/plain', contentId: 'memory-cid' },
        { filename: 'report.png', content: 'This is ordinary string content named report.png' },
        { filename: 'extensionless.txt', content: 'storage/order/file' },
        { filename: 'remote.png', path: 'https://cdn.example.test/image.png' },
      ],
    });
    assert.equal(result.messageId, 'resend-email-id');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Resend transport rejects missing or unreadable explicit paths before sending', async () => {
  const fake = fakeResend(async () => ({ data: { id: 'unused' }, error: null }));
  const transport = createResendTransport('test-api-key', fake.client);
  const missingPath = path.join(os.tmpdir(), 'missing-resend-attachment.png');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'resend-unreadable-'));

  try {
    for (const [attachment, errorCode] of [
      [{ filename: 'missing-path.png', path: missingPath }, 'ENOENT'],
      [{ filename: 'directory-path', path: directory }, 'EISDIR'],
    ]) {
      await assert.rejects(
        transport.sendMail({
          from: 'orders@example.test',
          to: ['shop@example.test'],
          subject: 'Test',
          text: 'Test',
          attachments: [attachment],
        }),
        (error) => {
          assert.match(error.message, /Unable to read email attachment/);
          assert.equal(error.cause.code, errorCode);
          return true;
        }
      );
    }
    assert.equal(fake.requests.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
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
