/**
 * Creates an admin account, or resets the password of an existing one
 * (which also signs that admin out everywhere).
 *
 *   npm run create-admin -- <username>
 *
 * The password is typed at a hidden prompt, so it never appears in shell
 * history. For automation, ADMIN_PASSWORD can be set instead.
 */
import { pool } from '../src/db.js';
import { hashPassword } from '../src/lib/passwords.js';

const MIN_PASSWORD_LENGTH = 12;

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error('No interactive terminal: set ADMIN_PASSWORD instead.'));
      return;
    }
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          // Ctrl+C
          stdout.write('\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdin.on('data', onData);
  });
}

const username = process.argv[2]?.trim();
if (!username || !/^[A-Za-z0-9._-]{3,64}$/.test(username)) {
  console.error('Usage: npm run create-admin -- <username>   (3-64 chars: letters, digits, . _ -)');
  process.exit(1);
}

try {
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await readHidden('Password: ');
    const confirm = await readHidden('Repeat password: ');
    if (password !== confirm) {
      throw new Error('Passwords do not match.');
    }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const passwordHash = await hashPassword(password);
  const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', [username]);

  if (existing[0]) {
    await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [passwordHash, existing[0].id]);
    await pool.query('DELETE FROM admin_sessions WHERE admin_id = ?', [existing[0].id]);
    console.log(`Password reset for admin "${username}"; existing sessions signed out.`);
  } else {
    await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, passwordHash]);
    console.log(`Admin "${username}" created.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
