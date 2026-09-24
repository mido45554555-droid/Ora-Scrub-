import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { HttpError } from '../lib/httpError.js';
import { FILE_FIELDS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, MAX_TOTAL_FILES } from '../validation/order.js';

/**
 * Streams each uploaded image straight to a temporary file instead of
 * buffering it in memory.
 *
 * This is what lets the server take many uploads at once: memory use no
 * longer grows with the size or number of uploads (it was 10 images x
 * 5 MB per order held in RAM, which had to be capped and made customers
 * wait). The temp directory sits inside STORAGE_DIR so the final move
 * is a rename on the same volume, not a copy.
 */
export const TEMP_DIR = path.join(config.storageDir, '.tmp');

export async function ensureTempDir() {
  await mkdir(TEMP_DIR, { recursive: true });
}

const parser = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TEMP_DIR),
    // Random name: the customer's filename never touches the filesystem.
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.part`),
  }),
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

/** Deletes whatever this request wrote to the temp directory. */
export async function cleanupUploads(req) {
  const files = Object.values(req.files ?? {}).flat();
  await Promise.all(files.map((file) => rm(file.path, { force: true }).catch(() => {})));
}

export function parseOrderUpload(req, res, next) {
  parser(req, res, (error) => {
    if (!error) {
      // Whatever happens next, temp files must not be left behind: the
      // successful path moves them into storage first, so by then these
      // paths no longer exist and the cleanup is a no-op.
      res.once('close', () => {
        cleanupUploads(req).catch(() => {});
      });
      return next();
    }

    cleanupUploads(req).catch(() => {});

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
