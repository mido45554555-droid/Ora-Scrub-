import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  waitForConnections: true,
  charset: 'utf8mb4',
  // Store and read DATETIME as UTC so timestamps don't shift with the
  // server's local timezone.
  timezone: 'Z',
  // DECIMAL columns come back as JS numbers rather than strings.
  decimalNumbers: true,
});

// Make the database's own clock (CURRENT_TIMESTAMP, NOW()) UTC too, so
// column defaults and JS-supplied dates agree.
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

/**
 * Runs `work` inside a transaction on a dedicated connection. Commits
 * if it resolves, rolls back and rethrows if it throws.
 */
export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
