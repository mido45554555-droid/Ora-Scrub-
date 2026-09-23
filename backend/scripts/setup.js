/**
 * One-time (and safe to re-run) setup:
 *   1. creates .env from .env.example with fresh random secrets, if missing
 *   2. creates the database and a least-privilege app user
 *      (SELECT/INSERT/UPDATE/DELETE on that database only — no DROP,
 *      no ALTER, no access to other databases)
 *   3. applies db/schema.sql
 *
 * Uses DB_ROOT_USER / DB_ROOT_PASSWORD (XAMPP default: root, empty) only
 * for steps 2-3; the running app never uses root.
 *
 *   npm run setup
 *   DB_NAME=ora_scrubs_test npm run setup     # a separate test database
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');

if (!existsSync(envPath)) {
  const template = readFileSync(path.join(root, '.env.example'), 'utf8');
  const filled = template
    .replace(/^INTERNAL_API_KEY=$/m, `INTERNAL_API_KEY=${randomBytes(32).toString('base64url')}`)
    .replace(/^DB_PASSWORD=$/m, `DB_PASSWORD=${randomBytes(24).toString('base64url')}`);
  writeFileSync(envPath, filled, { mode: 0o600 });
  console.log('Created .env with new random INTERNAL_API_KEY and DB_PASSWORD.');
}
process.loadEnvFile(envPath);

const env = process.env;
const identifier = /^[A-Za-z0-9_]+$/;
for (const name of ['DB_NAME', 'DB_USER']) {
  if (!identifier.test(env[name] ?? '')) {
    console.error(`${name} must only contain letters, digits and _ (got "${env[name] ?? ''}").`);
    process.exit(1);
  }
}
if (!env.DB_PASSWORD) {
  console.error('DB_PASSWORD is empty in .env — set a strong password for the app database user.');
  process.exit(1);
}

let connection;
try {
  connection = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_ROOT_USER || 'root',
    password: env.DB_ROOT_PASSWORD ?? '',
    multipleStatements: true,
  });
} catch (error) {
  console.error(
    `Could not connect to MariaDB/MySQL as "${env.DB_ROOT_USER || 'root'}" (${error.code ?? error.message}).\n` +
      'Start MySQL from the XAMPP control panel, or set DB_ROOT_USER / DB_ROOT_PASSWORD in .env.'
  );
  process.exit(1);
}

const db = env.DB_NAME;
const user = env.DB_USER;

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  // The app may connect via "localhost" or "127.0.0.1"; MariaDB treats
  // these as different hosts, so the user is created for both.
  for (const host of ['localhost', '127.0.0.1']) {
    await connection.query('CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?', [user, host, env.DB_PASSWORD]);
    await connection.query('ALTER USER ?@? IDENTIFIED BY ?', [user, host, env.DB_PASSWORD]);
    await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${db}\`.* TO ?@?`, [user, host]);
  }
  await connection.query('FLUSH PRIVILEGES');

  await connection.query(`USE \`${db}\``);
  await connection.query(readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8'));

  // Columns added after the first release. schema.sql creates them for
  // new databases; this adds them to databases created before that.
  // (Checked via information_schema because MySQL, unlike MariaDB, has
  // no ADD COLUMN IF NOT EXISTS.)
  const addedColumns = [
    ['orders', 'notified_at', 'DATETIME NULL AFTER client_ip'],
    ['orders', 'notify_attempts', 'TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER notified_at'],
    ['orders', 'notify_locked_until', 'DATETIME NULL AFTER notify_attempts'],
  ];
  for (const [table, column, definition] of addedColumns) {
    const [rows] = await connection.query(
      'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [db, table, column]
    );
    if (rows.length === 0) {
      await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`Added column ${table}.${column}`);
    }
  }
  const [indexes] = await connection.query(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_orders_pending_notify'",
    [db]
  );
  if (indexes.length === 0) {
    await connection.query('ALTER TABLE orders ADD KEY idx_orders_pending_notify (notified_at, created_at)');
  }

  console.log(`Database "${db}" is ready; app user "${user}" has SELECT/INSERT/UPDATE/DELETE on it only.`);
  console.log('Next: npm run create-admin -- <username>');
} finally {
  await connection.end();
}
