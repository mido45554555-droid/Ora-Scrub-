import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

/**
 * Uploads live at <STORAGE_DIR>/<order reference>/<random uuid>.<ext>.
 * Both path segments are generated server-side (never taken from the
 * request), and the directory is never web-served — files are only
 * readable through the authenticated admin API.
 */

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

function resolveInsideStorage(...segments) {
  for (const segment of segments) {
    if (!SAFE_SEGMENT.test(segment) || segment === '.' || segment === '..') {
      throw new Error(`Unsafe storage path segment: ${segment}`);
    }
  }
  const resolved = path.resolve(config.storageDir, ...segments);
  if (!resolved.startsWith(config.storageDir + path.sep)) {
    throw new Error('Resolved storage path escapes the storage directory');
  }
  return resolved;
}

export async function ensureStorageDir() {
  await mkdir(config.storageDir, { recursive: true });
}

/** @param {{ storedName: string, buffer: Buffer }[]} files */
export async function writeOrderFiles(reference, files) {
  const dir = resolveInsideStorage(reference);
  await mkdir(dir, { recursive: true });
  for (const file of files) {
    // 'wx' fails instead of overwriting if the name somehow already exists.
    await writeFile(resolveInsideStorage(reference, file.storedName), file.buffer, { flag: 'wx' });
  }
}

export async function removeOrderFiles(reference) {
  await rm(resolveInsideStorage(reference), { recursive: true, force: true });
}

export function storedFilePath(reference, storedName) {
  return resolveInsideStorage(reference, storedName);
}
