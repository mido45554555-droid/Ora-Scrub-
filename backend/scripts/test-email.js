/**
 * Checks the email settings in .env and sends one test message.
 *
 *   npm run mail:test
 */
import { config } from '../src/config.js';
import { sendTestEmail, stopNotificationWorker } from '../src/services/notifier.js';

const HINTS = [
  [
    /Resend API request failed \(401\)|invalid_api_key/i,
    'Resend rejected the API key. Check RESEND_API_KEY in the backend environment.',
  ],
  [/Resend API request failed \(403\)|invalid_from_address/i, 'Check that MAIL_FROM uses an address on a domain verified in Resend.'],
];

if (!config.mail.enabled) {
  const missing = ['RESEND_API_KEY', 'MAIL_FROM', 'ORDER_NOTIFY_TO'].filter((name) => !process.env[name]);
  console.error(`Email is off — missing in backend/.env: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Sending a test email through Resend from ${config.mail.from} …`);

try {
  const info = await sendTestEmail();
  console.log(`Sent to ${config.mail.to.join(', ')} (id: ${info.messageId})`);
  console.log('Check the inbox — look in Spam too, just in case.');
} catch (error) {
  console.error(`\nFailed: ${error.message}\n`);
  const hint = HINTS.find(([pattern]) => pattern.test(error.message));
  if (hint) console.error(hint[1]);
  process.exitCode = 1;
} finally {
  stopNotificationWorker();
}
