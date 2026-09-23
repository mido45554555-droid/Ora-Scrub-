import { HttpError } from '../lib/httpError.js';

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Not found.'));
}

// Express recognizes error handlers by their 4-argument signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.fields && { fields: error.fields }) },
    });
    return;
  }

  // Malformed JSON bodies from express.json()
  if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
    const status = error.type === 'entity.too.large' ? 413 : 400;
    res.status(status).json({ error: { code: 'BAD_REQUEST', message: 'Invalid request body.' } });
    return;
  }

  // Anything else is a bug or an infrastructure problem: log it in full,
  // tell the caller nothing about it.
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
}
