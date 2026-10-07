import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pool, withTransaction } from '../db.js';
import { generateOrderReference } from '../lib/reference.js';
import { findAvailableBatch, processingBatchStart } from '../lib/processingWeek.js';
import { config } from '../config.js';
import { moveOrderFiles, removeOrderFiles } from './fileStorage.js';

const MAX_REFERENCE_ATTEMPTS = 5;

/** Keeps the customer's filename for display only — never used on disk. */
function displayName(originalName) {
  const base = path.basename(String(originalName ?? '')).replace(/[\u0000-\u001F\u007F]/g, '');
  return (base || 'image').slice(0, 255);
}

/**
 * Saves a validated order and its images atomically: the order row,
 * file rows and files on disk either all exist afterwards or none do.
 *
 * @param {object} params
 * @param {import('zod').infer<typeof import('../validation/order.js').orderDataSchema>} params.data
 * @param {{ kind: string, originalName: string, tempPath: string, sizeBytes: number, mime: string, extension: string }[]} params.files
 * @param {string | null} params.clientIp
 * @returns {Promise<{ reference: string, status: string, batchDate: string, queuePosition: number }>}
 */
export async function createOrder({ data, files, clientIp }) {
  for (let attempt = 1; attempt <= MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const reference = generateOrderReference();
    try {
      return await insertOrder(reference, data, files, clientIp);
    } catch (error) {
      const duplicateReference =
        error?.code === 'ER_DUP_ENTRY' && String(error.message).includes('uq_orders_reference');
      if (!duplicateReference) throw error;
    }
  }
  throw new Error('Could not generate a unique order reference');
}

async function insertOrder(reference, data, files, clientIp) {
  const { customer, measurements, customization, payment } = data;

  const storedFiles = files.map((file) => ({
    ...file,
    id: randomUUID(),
    storedName: `${randomUUID()}.${file.extension}`,
  }));

  let filesWritten = false;
  try {
    return await withTransaction(async (connection) => {
      // Serialize allocators across concurrent requests and app processes.
      await connection.query('SELECT id FROM order_queue_lock WHERE id = 1 FOR UPDATE');
      // processing_week is retained for database compatibility. New rows store
      // Saturday batch dates; older rows retain their original historical dates.
      const { batchDate, queuePosition } = await findAvailableBatch(
        processingBatchStart(new Date(), config.processingTimeZone),
        async (candidateDate) => {
          const [[lastAssigned]] = await connection.query(
            'SELECT COALESCE(MAX(queue_position), 0) AS last_position FROM orders WHERE processing_week = ?',
            [candidateDate]
          );
          return lastAssigned.last_position;
        }
      );

      const [result] = await connection.query(
        `INSERT INTO orders (
           reference, locale, processing_week, queue_position,
           full_name, mobile_number, address, height_cm, weight_kg,
           arm_length, shoulder_circumference, blouse_length, trouser_length,
           hip_circumference, waist_circumference, chest_circumference, thigh_circumference,
           shape, material, color_description, additional_details,
           payment_method, client_ip
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reference,
          data.locale,
          batchDate,
          queuePosition,
          customer.fullName,
          customer.mobileNumber,
          customer.address,
          customer.heightCm,
          customer.weightKg,
          measurements.armLength,
          measurements.shoulderCircumference,
          measurements.blouseLength,
          measurements.trouserLength,
          measurements.hipCircumference,
          measurements.waistCircumference,
          measurements.chestCircumference,
          measurements.thighCircumference,
          customization.shape,
          customization.material,
          customization.colorDescription,
          customization.additionalDetails,
          payment.method,
          clientIp,
        ]
      );
      const orderId = result.insertId;

      if (storedFiles.length > 0) {
        await connection.query(
          `INSERT INTO order_files (id, order_id, kind, original_name, stored_name, mime_type, size_bytes)
           VALUES ?`,
          [
            storedFiles.map((file) => [
              file.id,
              orderId,
              file.kind,
              displayName(file.originalName),
              file.storedName,
              file.mime,
              file.sizeBytes,
            ]),
          ]
        );
      }

      // Written last, still inside the transaction: if the disk write
      // fails, the rows roll back; if the commit fails, the catch below
      // removes the files.
      filesWritten = true;
      await moveOrderFiles(reference, storedFiles);

      return {
        reference,
        status: 'pending_review',
        batchDate,
        queuePosition,
      };
    });
  } catch (error) {
    if (filesWritten) {
      await removeOrderFiles(reference).catch(() => { });
    }
    throw error;
  }
}

/** Exposes only non-personal queue confirmation data to the trusted site proxy. */
export async function getOrderQueueSummary(reference) {
  const [rows] = await pool.query(
    `SELECT reference, status, CAST(processing_week AS CHAR) AS batch_date,
            queue_position, created_at
       FROM orders WHERE reference = ? LIMIT 1`,
    [reference]
  );
  if (!rows[0]) return null;
  return {
    orderReference: rows[0].reference,
    status: rows[0].status,
    batchDate: rows[0].batch_date,
    workStartDate: rows[0].batch_date,
    batchPosition: rows[0].queue_position,
    queuePosition: rows[0].queue_position,
    createdAt: rows[0].created_at.toISOString(),
    batchCapacity: 10,
  };
}
