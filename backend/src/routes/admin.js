import { Router, json } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/httpError.js';
import { adminLimiter, loginLimiter, requireAdmin } from '../middleware/security.js';
import {
  ORDER_STATUSES,
  findOrderFile,
  getOrder,
  listOrders,
  login,
  logout,
  updateOrder,
} from '../services/adminService.js';
import { storedFilePath } from '../services/fileStorage.js';

export const adminRouter = Router();

adminRouter.use(adminLimiter, json({ limit: '10kb' }));

const REFERENCE_PATTERN = /^ORA-\d{6}-[0-9A-Z]{6}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function parseOrThrow(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid request.', Object.fromEntries(
      parsed.error.issues.map((issue) => [issue.path.join('.') || '_', issue.message])
    ));
  }
  return parsed.data;
}

function orderReference(req) {
  const { reference } = req.params;
  if (!REFERENCE_PATTERN.test(reference)) {
    throw new HttpError(404, 'NOT_FOUND', 'Order not found.');
  }
  return reference;
}

// --- Session -----------------------------------------------------------------

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

adminRouter.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = parseOrThrow(loginSchema, req.body);
  const session = await login(username, password);
  if (!session) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect username or password.');
  }
  res.json({ token: session.token, expiresAt: session.expiresAt, admin: { username: session.username } });
});

adminRouter.use(requireAdmin);

adminRouter.post('/logout', async (req, res) => {
  await logout(req.admin.tokenHash);
  res.status(204).end();
});

adminRouter.get('/me', (req, res) => {
  res.json({ admin: { username: req.admin.username } });
});

// --- Orders ------------------------------------------------------------------

const listSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

adminRouter.get('/orders', async (req, res) => {
  res.json(await listOrders(parseOrThrow(listSchema, req.query)));
});

adminRouter.get('/orders/:reference', async (req, res) => {
  const order = await getOrder(orderReference(req));
  if (!order) throw new HttpError(404, 'NOT_FOUND', 'Order not found.');
  res.json({ order });
});

const updateSchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    adminNotes: z
      .string()
      .max(2000)
      .nullable()
      .optional()
      .transform((value) => (value === undefined ? undefined : value?.trim() || null)),
  })
  .strict()
  .refine((body) => body.status !== undefined || body.adminNotes !== undefined, {
    message: 'Nothing to update.',
  });

adminRouter.patch('/orders/:reference', async (req, res) => {
  const reference = orderReference(req);
  const changes = parseOrThrow(updateSchema, req.body);
  if (!(await updateOrder(reference, changes))) {
    throw new HttpError(404, 'NOT_FOUND', 'Order not found.');
  }
  res.json({ order: await getOrder(reference) });
});

adminRouter.get('/orders/:reference/files/:fileId', async (req, res) => {
  const reference = orderReference(req);
  const { fileId } = req.params;
  const file = UUID_PATTERN.test(fileId) ? await findOrderFile(reference, fileId) : null;
  if (!file) throw new HttpError(404, 'NOT_FOUND', 'File not found.');

  // Content-Type comes from the server-side signature check at upload
  // time, and nosniff (set by helmet) stops the browser second-guessing it.
  res.type(file.mime_type);
  res.attachment(file.original_name);
  res.set('Content-Disposition', res.get('Content-Disposition').replace(/^attachment/, 'inline'));
  res.sendFile(storedFilePath(reference, file.stored_name), (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found.' } });
    }
  });
});
