import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test-user';
process.env.SMTP_PASS = 'test-password';
delete process.env.SMTP_PASSWORD;
process.env.MAIL_FROM = 'orders@example.test';
process.env.ORDER_NOTIFY_TO = 'shop@example.test';

const { buildOrderEmail } = await import('../src/services/orderEmail.js');

test('order email represents stored image paths with the explicit path field', () => {
  const order = {
    reference: 'ORA-260921-AAAAAA',
    full_name: 'Test Customer',
    created_at: new Date('2026-10-10T12:00:00Z'),
    locale: 'en',
    payment_method: 'instapay',
  };
  const files = [{
    kind: 'payment_screenshot',
    stored_name: 'payment-image',
    mime_type: 'image/png',
    size_bytes: 100,
  }];

  const { attachments } = buildOrderEmail(order, files, (file) => `storage/order/${file.stored_name}`);
  const payment = attachments.find((attachment) => attachment.filename === 'payment-screenshot.payment-image');

  assert.deepEqual(payment, {
    filename: 'payment-screenshot.payment-image',
    path: 'storage/order/payment-image',
    contentType: 'image/png',
  });
});

test('order email keeps realistic stored image paths out of attachment content', () => {
  const order = {
    reference: 'ORA-260921-AAAAAA',
    full_name: 'Test Customer',
    created_at: new Date('2026-10-10T12:00:00Z'),
    locale: 'en',
    payment_method: 'instapay',
  };
  const files = [{
    kind: 'payment_screenshot',
    stored_name: 'payment-proof-abc123.png',
    mime_type: 'image/png',
    size_bytes: 100,
  }];
  const localPath = 'storage/order/payment-proof-abc123.png';

  const { attachments } = buildOrderEmail(order, files, () => localPath);
  const payment = attachments.find((attachment) => attachment.filename === 'payment-screenshot.png');

  assert.equal(payment.path, localPath);
  assert.equal(payment.filename, 'payment-screenshot.png');
  assert.equal(payment.contentType, 'image/png');
  assert.equal('content' in payment, false);
});
