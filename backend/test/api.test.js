/**
 * End-to-end API tests against a real MariaDB test database.
 * One-time prerequisite: DB_NAME=ora_scrubs_test npm run setup
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'ora_scrubs_test';
process.env.STORAGE_DIR = './test-storage';
process.env.ORDER_RATE_LIMIT = '1000';
process.env.ORDER_GLOBAL_RATE_LIMIT = '1000';
// Never send real email from tests, even once .env has SMTP credentials;
// the email tests inject a fake transport instead.
process.env.SMTP_HOST = '';
process.env.SMTP_PASS = '';
process.env.SMTP_USER = 'orders@example.test';
process.env.ORDER_NOTIFY_TO = 'shop@example.test';

const { config } = await import('../src/config.js');
const { pool } = await import('../src/db.js');
const { createApp } = await import('../src/app.js');
const { ensureStorageDir } = await import('../src/services/fileStorage.js');
const { ensureTempDir, TEMP_DIR } = await import('../src/middleware/upload.js');
const { hashPassword } = await import('../src/lib/passwords.js');
const { notifyOrder, runNotificationSweep, setMailTransportForTesting } = await import(
  '../src/services/notifier.js'
);
const { buildOrderEmail, MAX_ATTACHMENT_BYTES } = await import('../src/services/orderEmail.js');
const { limitConcurrentUploads } = await import('../src/middleware/security.js');
const { mintDeviceToken, readDeviceToken } = await import('../src/lib/deviceToken.js');
const { makeOrderLimiters } = await import('../src/middleware/security.js');
const { EventEmitter } = await import('node:events');

async function waitFor(check, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for condition');
}

const KEY = config.internalApiKey;
let server;
let baseUrl;

// Minimal byte sequences that pass the signature check.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(64, 3)]);

function validData(overrides = {}) {
  return {
    locale: 'ar',
    customer: {
      fullName: 'منى أحمد',
      mobileCountry: 'EG',
      mobileDial: '+20',
      mobileNumber: '0100 123 4567',
      address: '12 شارع التحرير، الدور الثالث، القاهرة',
      heightCm: '165',
      weightKg: '62.5',
    },
    measurements: {
      armLength: '58',
      shoulderCircumference: '40',
      blouseLength: '70',
      trouserLength: '100',
      hipCircumference: '98',
      waistCircumference: '76',
      chestCircumference: '90',
      thighCircumference: '55',
    },
    customization: {
      shape: 'V-neck, straight trousers',
      material: 'rosaline',
      colorDescription: 'Soft ivory with a slightly warm tone',
      additionalDetails: 'Two pockets',
    },
    payment: { method: 'instapay' },
    ...overrides,
  };
}

function orderForm({ data = validData(), files } = {}) {
  const form = new FormData();
  form.append('data', typeof data === 'string' ? data : JSON.stringify(data));
  const fileList = files ?? [
    ['colorReferenceImage', PNG, 'color.png', 'image/png'],
    ['paymentScreenshot', JPEG, 'إيصال الدفع.jpg', 'image/jpeg'],
    ['designReferenceImages', WEBP, 'design.webp', 'image/webp'],
    ['referencePhotos', JPEG, 'tailor-1.jpg', 'image/jpeg'],
    ['referencePhotos', PNG, 'tailor-2.png', 'image/png'],
  ];
  for (const [field, bytes, name, type] of fileList) {
    form.append(field, new Blob([bytes], { type }), name);
  }
  return form;
}

function api(pathname, { key = KEY, ip, headers = {}, ...init } = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      ...(key && { 'x-internal-api-key': key }),
      ...(ip && { 'x-client-ip': ip }),
      ...headers,
    },
  });
}

const submitOrder = (form, options = {}) => api('/api/orders', { method: 'POST', body: form, ...options });

before(async () => {
  await rm(config.storageDir, { recursive: true, force: true });
  await ensureStorageDir();
  await ensureTempDir();
  await pool.query('DELETE FROM orders');
  await pool.query('DELETE FROM admins');
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await rm(config.storageDir, { recursive: true, force: true });
});

describe('access control', () => {
  test('health check is public and reveals nothing else', async () => {
    const res = await api('/api/health', { key: null });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });

  test('order endpoint rejects requests without the internal key', async () => {
    const res = await submitOrder(orderForm(), { key: null });
    assert.equal(res.status, 401);
  });

  test('order endpoint rejects a wrong internal key', async () => {
    const res = await submitOrder(orderForm(), { key: 'x'.repeat(40) });
    assert.equal(res.status, 401);
  });

  test('security headers are set and responses are not cacheable', async () => {
    const res = await api('/api/health');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-powered-by'), null);
  });
});

describe('order submission', () => {
  test('stores a valid order, its rows and its files', async () => {
    const res = await submitOrder(orderForm(), { ip: '203.0.113.10' });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.match(body.orderReference, /^ORA-\d{6}-[0-9A-Z]{6}$/);

    const [[order]] = await pool.query('SELECT * FROM orders WHERE reference = ?', [body.orderReference]);
    assert.equal(order.full_name, 'منى أحمد');
    assert.equal(order.mobile_number, '+20 1001234567', 'stored in one international format, leading 0 dropped');
    assert.equal(order.weight_kg, 62.5);
    assert.equal(order.material, 'rosaline');
    assert.equal(order.color_description, 'Soft ivory with a slightly warm tone');
    assert.equal(order.status, 'pending_review');
    assert.equal(order.locale, 'ar');
    assert.equal(order.client_ip, '203.0.113.10');

    const [files] = await pool.query('SELECT * FROM order_files WHERE order_id = ?', [order.id]);
    assert.equal(files.length, 5);
    const screenshot = files.find((f) => f.kind === 'payment_screenshot');
    assert.equal(screenshot.original_name, 'إيصال الدفع.jpg', 'Arabic filenames survive');
    assert.equal(screenshot.mime_type, 'image/jpeg');
    assert.match(screenshot.stored_name, /^[0-9a-f-]{36}\.jpg$/, 'stored name is random, not user-supplied');

    const onDisk = await readdir(path.join(config.storageDir, body.orderReference));
    assert.equal(onDisk.length, 5);
  });

  test('returns field errors keyed like the frontend form', async () => {
    const data = validData();
    data.customer.fullName = '';
    data.customer.mobileNumber = '123';
    data.measurements.armLength = '500';
    data.payment.method = 'cash';
    const res = await submitOrder(orderForm({ data, files: [] }));
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.code, 'VALIDATION_FAILED');
    assert.ok(error.fields['customer.fullName']);
    assert.equal(error.fields['customer.mobileNumber'], 'phoneEg', 'too-short Egyptian number rejected');
    assert.ok(error.fields['measurements.armLength']);
    assert.ok(error.fields['payment.method']);
    assert.ok(error.fields['customization.colorReferenceImage']);
    assert.ok(error.fields['payment.screenshot']);
  });

  test('rejects a non-image disguised as a PNG', async () => {
    const fake = Buffer.from('<?php system($_GET["c"]); ?>');
    const res = await submitOrder(
      orderForm({
        files: [
          ['colorReferenceImage', PNG, 'color.png', 'image/png'],
          ['paymentScreenshot', fake, 'receipt.png', 'image/png'],
        ],
      })
    );
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.fields['payment.screenshot'], 'fileType');
  });

  test('rejects more than 4 images in a gallery field', async () => {
    const files = [
      ['colorReferenceImage', PNG, 'c.png', 'image/png'],
      ['paymentScreenshot', PNG, 'p.png', 'image/png'],
      ...Array.from({ length: 5 }, (_, i) => ['referencePhotos', PNG, `r${i}.png`, 'image/png']),
    ];
    const res = await submitOrder(orderForm({ files }));
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.ok(error.fields['measurements.referencePhotos']);
  });

  test('rejects files over 5 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await submitOrder(
      orderForm({
        files: [
          ['colorReferenceImage', big, 'huge.png', 'image/png'],
          ['paymentScreenshot', PNG, 'p.png', 'image/png'],
        ],
      })
    );
    assert.equal(res.status, 413);
    const { error } = await res.json();
    assert.ok(error.fields['customization.colorReferenceImage']);
  });

  test('rejects unknown file fields and malformed data', async () => {
    const extra = await submitOrder(orderForm({ files: [['avatar', PNG, 'a.png', 'image/png']] }));
    assert.equal(extra.status, 400);

    const badJson = await submitOrder(orderForm({ data: '{not json' }));
    assert.equal(badJson.status, 400);
    assert.equal((await badJson.json()).error.code, 'BAD_REQUEST');
  });

  test('nothing is left on disk or in the database after a rejected order', async () => {
    const [[{ before }]] = await pool.query('SELECT COUNT(*) AS `before` FROM orders');
    const orderDirs = async () => (await readdir(config.storageDir)).filter((n) => n.startsWith('ORA-'));
    const dirsBefore = (await orderDirs()).length;
    const data = validData();
    data.customer.address = 'short';
    await submitOrder(orderForm({ data }));
    const [[{ after: afterCount }]] = await pool.query('SELECT COUNT(*) AS `after` FROM orders');
    assert.equal(afterCount, before);
    assert.equal((await orderDirs()).length, dirsBefore);
  });
});

describe('rate limiting', () => {
  test('order submissions are rate limited per client IP', async () => {
    // The suite raises ORDER_RATE_LIMIT so other tests aren't throttled;
    // the login test below proves the limiter actually blocks.
    const res = await submitOrder(orderForm({ data: '{}' }), { ip: '198.51.100.7' });
    assert.match(res.headers.get('ratelimit-policy') ?? '', /^"?\d+/);
    assert.match(res.headers.get('ratelimit-policy'), /q=1000/);
  });

  test('login is limited to 10 attempts per 15 minutes per IP', async () => {
    const statuses = [];
    for (let i = 0; i < 12; i += 1) {
      const res = await api('/api/admin/login', {
        method: 'POST',
        ip: '192.0.2.99',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'nobody', password: 'wrong-password' }),
      });
      statuses.push(res.status);
    }
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
    assert.deepEqual(statuses.slice(10), [429, 429]);
  });
});

describe('admin API', () => {
  let token;
  let reference;
  const ip = '192.0.2.1';
  const json = { 'content-type': 'application/json' };
  const auth = () => ({ authorization: `Bearer ${token}` });

  before(async () => {
    await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [
      'owner',
      await hashPassword('correct horse battery staple'),
    ]);
    const res = await submitOrder(orderForm(), { ip: '203.0.113.20' });
    reference = (await res.json()).orderReference;
  });

  test('rejects wrong passwords and unknown users the same way', async () => {
    for (const body of [
      { username: 'owner', password: 'wrong' },
      { username: 'ghost', password: 'wrong' },
    ]) {
      const res = await api('/api/admin/login', { method: 'POST', ip, headers: json, body: JSON.stringify(body) });
      assert.equal(res.status, 401);
      assert.equal((await res.json()).error.code, 'INVALID_CREDENTIALS');
    }
  });

  test('logs in', async () => {
    const res = await api('/api/admin/login', {
      method: 'POST',
      ip,
      headers: json,
      body: JSON.stringify({ username: 'owner', password: 'correct horse battery staple' }),
    });
    assert.equal(res.status, 200);
    ({ token } = await res.json());
    assert.ok(token.length >= 40);

    const [[session]] = await pool.query('SELECT token_hash FROM admin_sessions');
    assert.notEqual(session.token_hash, token, 'only a hash of the token is stored');
  });

  test('admin routes require a valid session', async () => {
    assert.equal((await api('/api/admin/orders', { ip })).status, 401);
    assert.equal(
      (await api('/api/admin/orders', { ip, headers: { authorization: 'Bearer ' + 'a'.repeat(43) } })).status,
      401
    );
  });

  test('lists and searches orders', async () => {
    const res = await api('/api/admin/orders?q=' + encodeURIComponent(reference), { ip, headers: auth() });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.orders.length, 1);
    assert.equal(body.orders[0].reference, reference);

    // LIKE wildcards in the search are treated literally.
    const wildcard = await api('/api/admin/orders?q=%25', { ip, headers: auth() });
    assert.equal((await wildcard.json()).orders.length, 0);

    const badStatus = await api('/api/admin/orders?status=hacked', { ip, headers: auth() });
    assert.equal(badStatus.status, 400);
  });

  test('shows order detail and serves its files', async () => {
    const res = await api(`/api/admin/orders/${reference}`, { ip, headers: auth() });
    assert.equal(res.status, 200);
    const { order } = await res.json();
    assert.equal(order.measurements.chestCircumference, 90);
    assert.equal(order.files.length, 5);
    assert.equal(order.files[0].kind, 'payment_screenshot');

    const file = await api(order.files[0].url, { ip, headers: auth() });
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('content-type'), 'image/jpeg');
    assert.match(file.headers.get('content-disposition'), /^inline/);
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), JPEG);

    const noAuth = await api(order.files[0].url, { ip });
    assert.equal(noAuth.status, 401);
  });

  test('refuses path traversal in file and order URLs', async () => {
    for (const url of [
      `/api/admin/orders/${reference}/files/..%2F..%2F.env`,
      `/api/admin/orders/..%2F..%2F/files/00000000-0000-0000-0000-000000000000`,
    ]) {
      const res = await api(url, { ip, headers: auth() });
      assert.equal(res.status, 404);
    }
  });

  test('updates status and notes, and validates input', async () => {
    const res = await api(`/api/admin/orders/${reference}`, {
      method: 'PATCH',
      ip,
      headers: { ...json, ...auth() },
      body: JSON.stringify({ status: 'payment_confirmed', adminNotes: 'Screenshot checked' }),
    });
    assert.equal(res.status, 200);
    const { order } = await res.json();
    assert.equal(order.status, 'payment_confirmed');
    assert.equal(order.adminNotes, 'Screenshot checked');

    for (const body of [{ status: 'hacked' }, {}, { status: 'shipped', reference: 'x' }]) {
      const bad = await api(`/api/admin/orders/${reference}`, {
        method: 'PATCH',
        ip,
        headers: { ...json, ...auth() },
        body: JSON.stringify(body),
      });
      assert.equal(bad.status, 400);
    }
  });

  test('logout invalidates the session', async () => {
    const res = await api('/api/admin/logout', { method: 'POST', ip, headers: auth() });
    assert.equal(res.status, 204);
    assert.equal((await api('/api/admin/me', { ip, headers: auth() })).status, 401);
  });
});

describe('new-order email', () => {
  const sent = [];
  let failNext = false;
  const orderRow = async (reference) =>
    (await pool.query('SELECT * FROM orders WHERE reference = ?', [reference]))[0][0];

  before(() => {
    setMailTransportForTesting({
      sendMail: async (message) => {
        if (failNext) {
          failNext = false;
          throw new Error('SMTP is down');
        }
        sent.push(message);
      },
    });
  });
  after(() => setMailTransportForTesting(null));

  test('emails a new order with its images, escaping customer input', async () => {
    const data = validData();
    data.customer.fullName = '<script>alert(1)</script> Hacker';
    const res = await submitOrder(orderForm({ data }), { ip: '203.0.113.30' });
    const { orderReference } = await res.json();

    await waitFor(async () => (await orderRow(orderReference)).notified_at !== null);
    const message = sent.find((m) => m.subject.includes(orderReference));
    assert.ok(message, 'email sent');
    assert.deepEqual(message.to, ['shop@example.test']);
    assert.match(message.from, /orders@example\.test/);
    assert.ok(!message.html.includes('<script>alert'), 'customer HTML is not injected');
    assert.ok(message.html.includes('&lt;script&gt;'));
    assert.ok(message.html.includes('منى') || message.html.includes('Hacker'));
    const [logo, ...images] = message.attachments;
    assert.equal(logo.cid, 'ora-logo', 'brand logo embedded in the letterhead');
    assert.match(message.html, /src="cid:ora-logo"/);
    assert.equal(images.length, 5);
    assert.equal(images[0].filename, 'payment-screenshot.jpg', 'payment screenshot first');
    assert.ok(images.every((a) => /^[a-z-]+(-\d)?\.(jpg|png|webp)$/.test(a.filename)));
  });

  test('a failed email does not affect the order and is retried exactly once', async () => {
    failNext = true;
    const res = await submitOrder(orderForm(), { ip: '203.0.113.31' });
    assert.equal(res.status, 201, 'customer still gets a success');
    const { orderReference } = await res.json();

    await waitFor(async () => (await orderRow(orderReference)).notify_attempts === 1);
    let row = await orderRow(orderReference);
    assert.equal(row.notified_at, null);
    assert.ok(row.notify_locked_until, 'backed off before the next try');

    const sentFor = () => sent.filter((m) => m.subject.includes(orderReference)).length;
    await runNotificationSweep();
    assert.equal(sentFor(), 0, 'no retry until the back-off expires');

    await pool.query('UPDATE orders SET notify_locked_until = NULL WHERE reference = ?', [orderReference]);
    await runNotificationSweep();
    await runNotificationSweep();
    assert.equal(sentFor(), 1);
    row = await orderRow(orderReference);
    assert.ok(row.notified_at);
    assert.equal(row.notify_attempts, 2);
  });

  test('overlapping attempts send only one email', async () => {
    const res = await submitOrder(orderForm(), { ip: '203.0.113.32' });
    const { orderReference } = await res.json();
    await waitFor(async () => (await orderRow(orderReference)).notified_at !== null);
    await pool.query(
      'UPDATE orders SET notified_at = NULL, notify_locked_until = NULL WHERE reference = ?',
      [orderReference]
    );

    const results = await Promise.all([notifyOrder(orderReference), notifyOrder(orderReference)]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(sent.filter((m) => m.subject.includes(orderReference)).length, 2, 'original + one resend');
  });

  test('email includes a human-readable fabric type label', () => {
    const order = {
      reference: 'ORA-260921-AAAAAA',
      full_name: 'A',
      created_at: new Date(),
      payment_method: 'instapay',
      locale: 'ar',
      material: 'rosaline',
      shape: 'Straight fit',
      color_description: 'Ivory',
      additional_details: 'N/A',
    };
    const email = buildOrderEmail(order, [], () => '');
    assert.match(email.html, /بروزالين/);
    assert.match(email.text, /بروزالين/);
  });

  test('attachments stay under the email size limit, payment screenshot first', () => {
    const file = (kind, i) => ({
      kind,
      stored_name: `${i}.jpg`,
      mime_type: 'image/jpeg',
      size_bytes: 5 * 1024 * 1024,
    });
    const files = [
      file('design_reference', 1),
      file('design_reference', 2),
      file('reference_photo', 3),
      file('color_reference', 4),
      file('payment_screenshot', 5),
    ];
    const order = {
      reference: 'ORA-260921-AAAAAA',
      full_name: 'A',
      created_at: new Date(),
      payment_method: 'instapay',
      locale: 'ar',
    };
    const email = buildOrderEmail(order, files, (f) => f.stored_name);
    const images = email.attachments.filter((a) => !a.cid);
    assert.ok(images.length * 5 * 1024 * 1024 <= MAX_ATTACHMENT_BYTES);
    assert.equal(images[0].filename, 'payment-screenshot.jpg');
    assert.equal(images[1].filename, 'color-reference.jpg');
    assert.match(email.html, /لم تُرفق/, 'says some images were left on the server');
  });
});

describe('streamed uploads leave nothing behind', () => {
  // Uploads stream to <STORAGE_DIR>/.tmp; a leak there would quietly
  // fill the disk, so every path must clean up after itself.
  const tempFiles = async () => (await readdir(TEMP_DIR)).length;

  test('temp files are gone after a successful order', async () => {
    const res = await submitOrder(orderForm(), { ip: '198.18.1.1' });
    assert.equal(res.status, 201);
    const { orderReference } = await res.json();
    await waitFor(async () => (await tempFiles()) === 0);
    assert.equal(await tempFiles(), 0);
    // ...because they were moved into the order folder.
    assert.equal((await readdir(path.join(config.storageDir, orderReference))).length, 5);
  });

  test('temp files are gone after a rejected order', async () => {
    const fake = Buffer.from('not an image');
    const res = await submitOrder(
      orderForm({ files: [['colorReferenceImage', fake, 'c.png', 'image/png'], ['paymentScreenshot', PNG, 'p.png', 'image/png']] }),
      { ip: '198.18.1.2' }
    );
    assert.equal(res.status, 400);
    await waitFor(async () => (await tempFiles()) === 0);
    assert.equal(await tempFiles(), 0, 'rejected uploads are deleted');
  });

  test('temp files are gone after an oversized upload', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await submitOrder(
      orderForm({ files: [['colorReferenceImage', big, 'huge.png', 'image/png'], ['paymentScreenshot', PNG, 'p.png', 'image/png']] }),
      { ip: '198.18.1.3' }
    );
    assert.equal(res.status, 413);
    await waitFor(async () => (await tempFiles()) === 0);
    assert.equal(await tempFiles(), 0);
  });
});

describe('upload concurrency guard', () => {
  // Uploads stream to disk, so this guard bounds disk I/O rather than
  // memory; it must never leak a slot, or the endpoint would jam shut.
  const fakeRes = () => Object.assign(new EventEmitter(), { set: () => {} });

  test('allows up to the limit, refuses the next one, frees slots after', () => {
    const guard = limitConcurrentUploads(2);
    const results = [];
    const first = fakeRes();
    guard({}, first, (e) => results.push(e));
    guard({}, fakeRes(), (e) => results.push(e));
    assert.deepEqual(results, [undefined, undefined]);

    guard({}, fakeRes(), (e) => results.push(e));
    assert.equal(results[2]?.status, 503);
    assert.equal(results[2]?.code, 'SERVER_BUSY');

    first.emit('close');
    guard({}, fakeRes(), (e) => results.push(e));
    assert.equal(results[3], undefined, 'slot reusable once a request ends');
  });

  test('a duplicate close event does not free an extra slot', () => {
    const guard = limitConcurrentUploads(1);
    const results = [];
    const res = fakeRes();
    guard({}, res, (e) => results.push(e));
    res.emit('close');
    res.emit('close');
    guard({}, fakeRes(), (e) => results.push(e));
    guard({}, fakeRes(), (e) => results.push(e));
    assert.equal(results[1], undefined);
    assert.equal(results[2]?.status, 503);
  });
});

describe('per-device limits', () => {
  // Customers on one mobile network share an IP, so the tight limit is
  // counted per browser (a signed cookie) and the IP limit is looser.

  test('a device token survives a round trip and cannot be forged', () => {
    const token = mintDeviceToken();
    const id = readDeviceToken(token);
    assert.ok(id, 'our own token is accepted');
    assert.equal(readDeviceToken(token), id, 'same id every time');

    const [v, deviceId, issuedAt, signature] = token.split('.');
    assert.equal(readDeviceToken(`${v}.${deviceId}.${issuedAt}.${signature.slice(0, -2)}XX`), null, 'tampered signature');
    assert.equal(readDeviceToken(`${v}.other-id.${issuedAt}.${signature}`), null, 'swapped id');
    assert.equal(readDeviceToken('not-a-token'), null);
    assert.equal(readDeviceToken(undefined), null);
    assert.equal(readDeviceToken(token, Date.now() + 400 * 24 * 60 * 60 * 1000), null, 'expired');
  });

  test('the backend hands a new token to a browser that has none', async () => {
    const res = await submitOrder(orderForm(), { ip: '198.51.44.1' });
    assert.equal(res.status, 201);
    const issued = res.headers.get('x-device-token');
    assert.ok(issued, 'token returned for the site to store in a cookie');
    assert.ok(readDeviceToken(issued), 'and it is a valid one');
  });

  test('a known device keeps its token', async () => {
    const token = mintDeviceToken();
    const res = await submitOrder(orderForm(), { ip: '198.51.44.2', headers: { 'x-device-token': token } });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('x-device-token'), null, 'no need to re-issue');
  });

  test('one device is limited without blocking others on the same address', async () => {
    const strict = createApp({ orderLimiters: makeOrderLimiters({ perDevice: 2, perIp: 50, overall: 50 }) });
    const server = strict.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/orders`;
    const send = (token) =>
      fetch(url, {
        method: 'POST',
        body: orderForm(),
        headers: { 'x-internal-api-key': KEY, 'x-client-ip': '100.64.0.1', 'x-device-token': token },
      }).then((r) => r.status);

    try {
      const phone = mintDeviceToken();
      const laptop = mintDeviceToken();
      assert.deepEqual([await send(phone), await send(phone), await send(phone)], [201, 201, 429], 'one browser runs out');
      assert.equal(await send(laptop), 201, 'another browser on the same network is unaffected');
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('the address limit still catches a machine cycling through devices', async () => {
    const strict = createApp({ orderLimiters: makeOrderLimiters({ perDevice: 50, perIp: 3, overall: 50 }) });
    const server = strict.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api/orders`;

    try {
      const statuses = [];
      for (let i = 0; i < 5; i += 1) {
        statuses.push(
          await fetch(url, {
            method: 'POST',
            body: orderForm(),
            // A fresh device token every time — the IP layer is what stops it.
            headers: { 'x-internal-api-key': KEY, 'x-client-ip': '100.64.0.9', 'x-device-token': mintDeviceToken() },
          }).then((r) => r.status)
        );
      }
      assert.deepEqual(statuses, [201, 201, 201, 429, 429]);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

test('.htaccess blocks Apache from serving this folder', async () => {
  const htaccess = await readFile(path.join(backendRoot, '.htaccess'), 'utf8');
  assert.match(htaccess, /^Require all denied$/m);
});
