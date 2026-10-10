import { config } from '../config.js';
import { pool } from '../db.js';
import { storedFilePath } from './fileStorage.js';
import { buildOrderEmail } from './orderEmail.js';
import { createDeliveryActionToken } from './deliveryService.js';
import { createResendTransport } from './resendTransport.js';
import { createSmtpTransport } from './smtpTransport.js';

/**
 * Emails each new order to the shop. The order is already safely saved
 * before any of this runs — email is a notification, never a
 * requirement, so a mail outage can't lose or block an order.
 *
 * Reliability:
 * - sent right after the order is saved; if that fails, a background
 *   sweep retries with a growing delay (5, 10, 15... up to 60 minutes)
 *   for up to MAX_ATTEMPTS tries within RETRY_WINDOW_HOURS
 * - each attempt first "claims" the order with a single atomic UPDATE,
 *   so an order is never emailed twice even if attempts overlap
 */

const MAX_ATTEMPTS = 10;
const RETRY_WINDOW_HOURS = 72;
const SWEEP_INTERVAL_MS = 2 * 60 * 1000;
const SEND_LOCK_MINUTES = 3;

let transport = null;
let sweepTimer = null;

function getTransport() {
  transport ??= config.mail.provider === 'smtp'
    ? createSmtpTransport(config.mail.smtp)
    : createResendTransport(config.mail.apiKey);
  return transport;
}

/** Tests inject a fake transport ({ sendMail }) here. */
export function setMailTransportForTesting(fake) {
  transport = fake;
}

function isEnabled() {
  return config.mail.enabled || transport !== null;
}

/**
 * Tries to email one order. Resolves true if it was sent now, false if
 * it was skipped (already sent, being sent, or mail disabled) or failed
 * (it will be retried by the sweep).
 */
export async function notifyOrder(reference) {
  if (!isEnabled()) return false;

  const [claim] = await pool.query(
    `UPDATE orders
        SET notify_attempts = notify_attempts + 1,
            notify_locked_until = UTC_TIMESTAMP() + INTERVAL ? MINUTE
      WHERE reference = ?
        AND notified_at IS NULL
        AND (notify_locked_until IS NULL OR notify_locked_until <= UTC_TIMESTAMP())`,
    [SEND_LOCK_MINUTES, reference]
  );
  if (claim.affectedRows === 0) return false;

  try {
    const [[order]] = await pool.query('SELECT * FROM orders WHERE reference = ?', [reference]);
    const [files] = await pool.query(
      'SELECT kind, stored_name, mime_type, size_bytes FROM order_files WHERE order_id = ? ORDER BY created_at',
      [order.id]
    );

    const deliveryToken = await createDeliveryActionToken(reference);
    const deliveryActionUrl = deliveryToken
      ? `${config.publicSiteUrl}/${order.locale === 'ar' ? 'ar' : 'en'}/delivery/action/${deliveryToken}`
      : null;
    const message = buildOrderEmail(
      order,
      files,
      (file) => storedFilePath(reference, file.stored_name),
      { deliveryActionUrl }
    );
    await getTransport().sendMail({ from: config.mail.from, to: config.mail.to, ...message });

    await pool.query(
      'UPDATE orders SET notified_at = UTC_TIMESTAMP(), notify_locked_until = NULL WHERE reference = ?',
      [reference]
    );
    return true;
  } catch (error) {
    // Back off: retry after 5 min x attempts, capped at an hour.
    await pool
      .query(
        `UPDATE orders
            SET notify_locked_until = UTC_TIMESTAMP() + INTERVAL LEAST(notify_attempts * 5, 60) MINUTE
          WHERE reference = ?`,
        [reference]
      )
      .catch(() => { });
    console.error(`[notifier] Email for order ${reference} failed (will retry):`, error.message);
    return false;
  }
}

/**
 * Sends one test message through the configured provider (npm run mail:test).
 */
export async function sendTestEmail() {
  if (!config.mail.enabled) {
    throw new Error(
      'Email is not configured: set SMTP settings or RESEND_API_KEY, along with MAIL_FROM and ORDER_NOTIFY_TO.'
    );
  }
  const info = await getTransport().sendMail({
    from: config.mail.from,
    to: config.mail.to,
    subject: 'ORA — اختبار إعدادات الإيميل',
    text: 'وصلتك الرسالة دي يبقى إعدادات الإيميل شغالة، وطلبات الموقع هتوصل على نفس العنوان.',
    html: '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px">وصلتك الرسالة دي يبقى إعدادات الإيميل شغالة، وطلبات الموقع هتوصل على نفس العنوان.</div>',
  });
  return info;
}

/** Fire-and-forget after an order is saved; never throws. */
export function queueOrderNotification(reference) {
  if (!isEnabled()) return;
  notifyOrder(reference).catch((error) => {
    console.error(`[notifier] Unexpected error for order ${reference}:`, error);
  });
}

/** Retries every order whose email is still pending. */
export async function runNotificationSweep() {
  if (!isEnabled()) return;
  const [pending] = await pool.query(
    `SELECT reference FROM orders
      WHERE notified_at IS NULL
        AND notify_attempts < ?
        AND created_at > UTC_TIMESTAMP() - INTERVAL ? HOUR
        AND (notify_locked_until IS NULL OR notify_locked_until <= UTC_TIMESTAMP())
      ORDER BY created_at
      LIMIT 20`,
    [MAX_ATTEMPTS, RETRY_WINDOW_HOURS]
  );
  for (const { reference } of pending) {
    await notifyOrder(reference);
  }
}

export function startNotificationWorker() {
  if (!config.mail.enabled) {
    console.warn(
      '[notifier] Order emails are OFF: configure SMTP or Resend, plus MAIL_FROM and ORDER_NOTIFY_TO. ' +
      'Orders are still saved.'
    );
    return;
  }
  console.log(`[notifier] Order emails enabled via ${config.mail.provider} → ${config.mail.to.join(', ')}`);

  const sweep = () =>
    runNotificationSweep().catch((error) => console.error('[notifier] Sweep failed:', error.message));
  // Retry sweeps start on the first interval; startup never sends email.
  sweepTimer = setInterval(sweep, SWEEP_INTERVAL_MS);
  sweepTimer.unref();
}

export function stopNotificationWorker() {
  if (sweepTimer) clearInterval(sweepTimer);
  sweepTimer = null;
  transport?.close?.();
}
