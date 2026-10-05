import { randomBytes } from 'node:crypto';
import { pool } from '../db.js';
import { sha256Hex } from '../lib/secrets.js';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const BATCH_CAPACITY = 10;
const ACTION_EXPIRY_DAYS = 30;

function validToken(token) {
    return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

function deliverySummary(row) {
    return {
        orderReference: row.reference,
        customerName: row.full_name,
        batchDate: row.batch_date,
        batchPosition: row.queue_position,
        batchCapacity: BATCH_CAPACITY,
        status: row.status,
        deliveredAt: row.delivered_at ?? null,
        actionState: row.delivered_at || row.status === 'delivered'
            ? 'already_delivered'
            : row.status === 'cancelled'
                ? 'cancelled'
                : 'pending',
    };
}

/** Creates/replaces the active single-order capability before composing its notification email. */
export async function createDeliveryActionToken(reference) {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = sha256Hex(token);
    const [result] = await pool.query(
        `UPDATE orders
        SET delivery_action_hash = ?,
            delivery_action_expires_at = UTC_TIMESTAMP() + INTERVAL ? DAY,
            delivery_action_used_at = NULL
      WHERE reference = ? AND delivered_at IS NULL AND status NOT IN ('cancelled', 'delivered')`,
        [tokenHash, ACTION_EXPIRY_DAYS, reference]
    );
    return result.affectedRows === 1 ? token : null;
}

/** Returns minimal order context for the server-rendered, token-protected confirmation page. */
export async function getDeliveryActionSummary(token) {
    if (!validToken(token)) return null;
    const tokenHash = sha256Hex(token);
    const [rows] = await pool.query(
        `SELECT reference, full_name, status, CAST(processing_week AS CHAR) AS batch_date,
            queue_position, DATE_FORMAT(delivered_at, '%Y-%m-%dT%H:%i:%sZ') AS delivered_at,
            (delivery_action_expires_at > UTC_TIMESTAMP()) AS token_valid
       FROM orders WHERE delivery_action_hash = ? LIMIT 1`,
        [tokenHash]
    );
    const row = rows[0];
    if (!row) return null;
    if (!row.delivered_at && !row.token_valid) return null;
    return deliverySummary(row);
}

/** Atomically consumes a valid action and marks the one associated order delivered. */
export async function confirmDelivery(token) {
    if (!validToken(token)) return { outcome: 'invalid' };
    const tokenHash = sha256Hex(token);
    const [result] = await pool.query(
        `UPDATE orders
        SET status = 'delivered',
            delivered_at = UTC_TIMESTAMP(),
            delivery_action_used_at = UTC_TIMESTAMP()
      WHERE delivery_action_hash = ?
        AND delivery_action_expires_at > UTC_TIMESTAMP()
        AND delivery_action_used_at IS NULL
        AND delivered_at IS NULL
        AND status IN ('pending_review','payment_confirmed','in_production','shipped','completed')`,
        [tokenHash]
    );
    if (result.affectedRows === 1) return { outcome: 'delivered' };

    const [rows] = await pool.query(
        'SELECT delivered_at, status FROM orders WHERE delivery_action_hash = ? LIMIT 1',
        [tokenHash]
    );
    const row = rows[0];
    if (row?.delivered_at || row?.status === 'delivered') return { outcome: 'already_delivered' };
    if (row?.status === 'cancelled') return { outcome: 'cancelled' };
    return { outcome: 'invalid' };
}

/** Batch counts are derived from retained order records, never from a mutable duplicate counter. */
export async function listBatchDeliverySummary() {
    const [rows] = await pool.query(
        `SELECT CAST(processing_week AS CHAR) AS batch_date,
            COUNT(*) AS total,
            SUM(status = 'delivered') AS delivered
       FROM orders
      GROUP BY processing_week
      ORDER BY processing_week DESC`
    );
    return rows.map((row) => {
        const total = Number(row.total);
        const delivered = Number(row.delivered);
        return {
            batchDate: row.batch_date,
            total,
            delivered,
            remaining: total - delivered,
            fullyDelivered: delivered === total,
        };
    });
}
