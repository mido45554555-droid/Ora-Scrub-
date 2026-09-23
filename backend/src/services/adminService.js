import { randomBytes } from 'node:crypto';
import { pool } from '../db.js';
import { config } from '../config.js';
import { burnPasswordCheck, verifyPassword } from '../lib/passwords.js';
import { sha256Hex } from '../lib/secrets.js';

export const ORDER_STATUSES = [
  'pending_review',
  'payment_confirmed',
  'in_production',
  'shipped',
  'delivered',
  'cancelled',
];

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/** @returns {Promise<{ token: string, expiresAt: Date, username: string } | null>} */
export async function login(username, password) {
  const [rows] = await pool.query(
    'SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1',
    [username]
  );
  const admin = rows[0];

  const valid = admin
    ? await verifyPassword(password, admin.password_hash)
    : await burnPasswordCheck(password);
  if (!admin || !valid) return null;

  // The raw token goes to the client once; only its hash is stored.
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.adminSessionMs);

  await pool.query('DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP()');
  await pool.query('INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)', [
    sha256Hex(token),
    admin.id,
    expiresAt,
  ]);
  await pool.query('UPDATE admins SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [admin.id]);

  return { token, expiresAt, username: admin.username };
}

/** @returns {Promise<{ id: number, username: string, tokenHash: string } | null>} */
export async function findSession(token) {
  const tokenHash = sha256Hex(token);
  const [rows] = await pool.query(
    `SELECT a.id, a.username
       FROM admin_sessions s
       JOIN admins a ON a.id = s.admin_id
      WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
      LIMIT 1`,
    [tokenHash]
  );
  return rows[0] ? { id: rows[0].id, username: rows[0].username, tokenHash } : null;
}

export async function logout(tokenHash) {
  await pool.query('DELETE FROM admin_sessions WHERE token_hash = ?', [tokenHash]);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function toOrderSummary(row) {
  return {
    reference: row.reference,
    status: row.status,
    locale: row.locale,
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toOrderDetail(row, files) {
  return {
    ...toOrderSummary(row),
    customer: {
      fullName: row.full_name,
      mobileNumber: row.mobile_number,
      address: row.address,
      heightCm: row.height_cm,
      weightKg: row.weight_kg,
    },
    measurements: {
      armLength: row.arm_length,
      shoulderCircumference: row.shoulder_circumference,
      blouseLength: row.blouse_length,
      trouserLength: row.trouser_length,
      hipCircumference: row.hip_circumference,
      waistCircumference: row.waist_circumference,
      chestCircumference: row.chest_circumference,
      thighCircumference: row.thigh_circumference,
    },
    customization: {
      shape: row.shape,
      colorDescription: row.color_description,
      additionalDetails: row.additional_details,
    },
    payment: { method: row.payment_method },
    adminNotes: row.admin_notes,
    files: files.map((file) => ({
      id: file.id,
      kind: file.kind,
      originalName: file.original_name,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      url: `/api/admin/orders/${row.reference}/files/${file.id}`,
    })),
  };
}

export async function listOrders({ status, q, page, pageSize }) {
  const where = [];
  const params = [];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (q) {
    const like = `%${escapeLike(q)}%`;
    where.push('(reference LIKE ? OR full_name LIKE ? OR mobile_number LIKE ?)');
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders ${whereSql}`, params);
  const [rows] = await pool.query(
    `SELECT reference, status, locale, full_name, mobile_number, payment_method, created_at, updated_at
       FROM orders ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return {
    orders: rows.map(toOrderSummary),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getOrder(reference) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE reference = ? LIMIT 1', [reference]);
  if (!rows[0]) return null;

  const [files] = await pool.query(
    `SELECT id, kind, original_name, mime_type, size_bytes
       FROM order_files WHERE order_id = ?
      ORDER BY FIELD(kind, 'payment_screenshot', 'color_reference', 'design_reference', 'reference_photo'), created_at`,
    [rows[0].id]
  );
  return toOrderDetail(rows[0], files);
}

/** @returns {Promise<boolean>} false if the order doesn't exist */
export async function updateOrder(reference, { status, adminNotes }) {
  const sets = [];
  const params = [];
  if (status !== undefined) {
    sets.push('status = ?');
    params.push(status);
  }
  if (adminNotes !== undefined) {
    sets.push('admin_notes = ?');
    params.push(adminNotes);
  }

  const [result] = await pool.query(`UPDATE orders SET ${sets.join(', ')} WHERE reference = ?`, [
    ...params,
    reference,
  ]);
  return result.affectedRows > 0;
}

export async function findOrderFile(reference, fileId) {
  const [rows] = await pool.query(
    `SELECT f.stored_name, f.mime_type, f.original_name
       FROM order_files f
       JOIN orders o ON o.id = f.order_id
      WHERE o.reference = ? AND f.id = ?
      LIMIT 1`,
    [reference, fileId]
  );
  return rows[0] ?? null;
}
