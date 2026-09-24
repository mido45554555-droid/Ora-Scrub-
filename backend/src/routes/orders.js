import { Router } from 'express';
import { HttpError } from '../lib/httpError.js';
import { detectImageTypeFromFile } from '../lib/imageType.js';
import { limitConcurrentUploads, orderSubmissionLimiter } from '../middleware/security.js';
import { config } from '../config.js';
import { parseOrderUpload } from '../middleware/upload.js';
import { queueOrderNotification } from '../services/notifier.js';
import { createOrder } from '../services/orderService.js';
import { FILE_FIELDS, flattenZodErrors, orderDataSchema } from '../validation/order.js';

export const ordersRouter = Router();

/**
 * POST /api/orders — multipart/form-data:
 *   data                   JSON string: { locale, customer, measurements, customization, payment: { method } }
 *   referencePhotos        0-4 images
 *   colorReferenceImage    exactly 1 image
 *   designReferenceImages  0-4 images
 *   paymentScreenshot      exactly 1 image
 *
 * 201 → { orderReference, status: "success" }
 * 400 → { error: { code: "VALIDATION_FAILED", message, fields: { "customer.fullName": "..." } } }
 */
const guardUploads = limitConcurrentUploads(config.uploadConcurrency);

ordersRouter.post('/', orderSubmissionLimiter, guardUploads, parseOrderUpload, async (req, res) => {
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

  const orderReference = await createOrder({ data: parsed.data, files, clientIp: req.clientIp });
  res.status(201).json({ orderReference, status: 'success' });

  // After responding: the customer never waits on (or sees) email
  // delivery, and a mail failure can't turn a saved order into an error.
  queueOrderNotification(orderReference);
});
