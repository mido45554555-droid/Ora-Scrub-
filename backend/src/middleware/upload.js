import multer from 'multer';
import { HttpError } from '../lib/httpError.js';
import { FILE_FIELDS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, MAX_TOTAL_FILES } from '../validation/order.js';

/**
 * Parses the order's multipart body into memory (max 10 files x 5 MB),
 * so nothing touches the disk until the whole order has been validated.
 */
const parser = multer({
  storage: multer.memoryStorage(),
  // Browsers send filenames as raw UTF-8; multer's latin1 default turns
  // Arabic names into mojibake.
  defParamCharset: 'utf8',
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_TOTAL_FILES,
    fields: 1, // just "data"
    fieldSize: 64 * 1024,
    fieldNameSize: 100,
    parts: MAX_TOTAL_FILES + 1,
    headerPairs: 200,
  },
}).fields(Object.entries(FILE_FIELDS).map(([name, rule]) => ({ name, maxCount: rule.max })));

export function parseOrderUpload(req, res, next) {
  parser(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const rule = FILE_FIELDS[error.field];
      if (error.code === 'LIMIT_FILE_SIZE' && rule) {
        return next(
          new HttpError(413, 'VALIDATION_FAILED', 'A file is too large.', {
            [rule.errorPath]: `fileSize:${MAX_FILE_SIZE_MB}`,
          })
        );
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE' && rule) {
        return next(
          new HttpError(400, 'VALIDATION_FAILED', 'Too many files.', {
            [rule.errorPath]: `tooManyFiles:${rule.max}`,
          })
        );
      }
      return next(new HttpError(400, 'BAD_REQUEST', 'Invalid upload.'));
    }

    // Malformed multipart body (busboy parse errors, aborted uploads)
    return next(new HttpError(400, 'BAD_REQUEST', 'Invalid upload.'));
  });
}
