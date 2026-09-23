/**
 * Checks the email settings in .env and sends one test message.
 *
 *   npm run mail:test
 */
import { config } from '../src/config.js';
import { sendTestEmail, stopNotificationWorker } from '../src/services/notifier.js';

const HINTS = [
  [
    /BadCredentials|Invalid login|535/i,
    'Gmail refused the login. SMTP_PASS must be a 16-character App Password\n' +
      '(https://myaccount.google.com/apppasswords), not the normal Gmail password,\n' +
      'and 2-Step Verification must be on for that account.',
  ],
  [
    /ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i,
    'Could not reach the mail server. Check the internet connection, SMTP_HOST/SMTP_PORT,\n' +
      'and whether a firewall is blocking outgoing mail ports (465 / 587).',
  ],
  [/ESOCKET|wrong version number|SSL/i, 'Port/encryption mismatch: use 465 with SMTP_SECURE=true, or 587 with SMTP_SECURE=false.'],
];

if (!config.mail.enabled) {
  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'ORDER_NOTIFY_TO'].filter(
    (name) => !process.env[name]
  );
  console.error(`Email is off — missing in backend/.env: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Logging in to ${config.mail.smtp.host} as ${config.mail.smtp.auth.user} …`);

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
