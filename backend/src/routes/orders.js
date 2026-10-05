import { Router } from 'express';
import { HttpError } from '../lib/httpError.js';
import { detectImageTypeFromFile } from '../lib/imageType.js';
import { limitConcurrentUploads } from '../middleware/security.js';
import { config } from '../config.js';
import { parseOrderUpload } from '../middleware/upload.js';
import { queueOrderNotification } from '../services/notifier.js';
<<<<<<< HEAD
import { createOrder } from '../services/orderService.js';
import { FILE_FIELDS, flattenZodErrors, orderDataSchema } from '../validation/order.js';

export const ordersRouter = Router();
=======
import { createOrder, getOrderQueueSummary } from '../services/orderService.js';
import { FILE_FIELDS, flattenZodErrors, orderDataSchema } from '../validation/order.js';

export const ordersRouter = Router();
const REFERENCE_PATTERN = /^ORA-\d{6}-[0-9A-Z]{6}$/;

ordersRouter.get('/:reference/queue', async (req, res) => {
  if (!REFERENCE_PATTERN.test(req.params.reference)) {
    throw new HttpError(404, 'NOT_FOUND', 'Order not found.');
  }
  const order = await getOrderQueueSummary(req.params.reference);
  if (!order) throw new HttpError(404, 'NOT_FOUND', 'Order not found.');
  res.json(order);
});
>>>>>>> cd6dd58 (first upload)

/**
 * POST /api/orders — multipart/form-data:
 *   data                   JSON string: { locale, customer, measurements, customization, payment: { method } }
 *   referencePhotos        0-4 images
 *   colorReferenceImage    exactly 1 image
 *   designReferenceImages  0-4 images
 *   paymentScreenshot      exactly 1 image
 *
<<<<<<< HEAD
 * 201 → { orderReference, status: "success" }
=======
 * 201 → { orderReference, status, batchDate, batchPosition, batchCapacity }
>>>>>>> cd6dd58 (first upload)
 * 400 → { error: { code: "VALIDATION_FAILED", message, fields: { "customer.fullName": "..." } } }
 */
const guardUploads = limitConcurrentUploads(config.uploadConcurrency);

ordersRouter.post('/', guardUploads, parseOrderUpload, async (req, res) => {
  let json;
  try {
    json = JSON.parse(typeof req.body?.data === 'string' ? req.body.data : '');
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Missing or invalid order data.');
  }

  const parsed = orderDataSchema.safeParse(json);
  const fieldErrors = parsed.success ? {} : flattenZodErrors(parsed.error);

  const files = [];
  for (const [field, rule] of Object.entries(FILE_FIELDS)) {
    const uploaded = req.files?.[field] ?? [];
    if (uploaded.length < rule.min) {
      fieldErrors[rule.errorPath] ??= rule.requiredMessage ?? 'fileRequired';
    }
    for (const file of uploaded) {
      // Read only the first bytes of the temp file, never the whole image.
      const type = await detectImageTypeFromFile(file.path);
      if (!type) {
        fieldErrors[rule.errorPath] ??= 'fileType';
        continue;
      }
      files.push({
        kind: rule.kind,
        originalName: file.originalname,
        tempPath: file.path,
        sizeBytes: file.size,
        mime: type.mime,
        extension: type.extension,
      });
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Please fix the highlighted fields.', fieldErrors);
  }

<<<<<<< HEAD
  const orderReference = await createOrder({ data: parsed.data, files, clientIp: req.clientIp });
  res.status(201).json({ orderReference, status: 'success' });

  // After responding: the customer never waits on (or sees) email
  // delivery, and a mail failure can't turn a saved order into an error.
  queueOrderNotification(orderReference);
=======
  const order = await createOrder({ data: parsed.data, files, clientIp: req.clientIp });
  res.status(201).json({
    referenceNumber: order.reference,
    orderReference: order.reference,
    status: 'success',
    orderStatus: order.status,
    batchDate: order.batchDate,
    workStartDate: order.batchDate,
    batchPosition: order.queuePosition,
    queuePosition: order.queuePosition,
    batchCapacity: 10,
    capacity: 10,
  });

  // After responding: the customer never waits on (or sees) email
  // delivery, and a mail failure can't turn a saved order into an error.
  queueOrderNotification(order.reference);
>>>>>>> cd6dd58 (first upload)
});
