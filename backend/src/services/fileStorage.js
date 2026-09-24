import { copyFile, mkdir, rename, rm } from 'node:fs/promises';
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

/**
 * Moves the streamed temp files into the order's folder. A rename on the
 * same volume, so no copy and no memory: the temp directory lives inside
 * STORAGE_DIR for exactly this reason. Falls back to copy+delete if the
 * two ever end up on different volumes.
 *
 * @param {{ storedName: string, tempPath: string }[]} files
 */
export async function moveOrderFiles(reference, files) {
  const dir = resolveInsideStorage(reference);
  await mkdir(dir, { recursive: true });
  for (const file of files) {
    const target = resolveInsideStorage(reference, file.storedName);
    try {
      await rename(file.tempPath, target);
    } catch (error) {
      if (error.code !== 'EXDEV') throw error;
      await copyFile(file.tempPath, target);
      await rm(file.tempPath, { force: true });
    }
  }
}

export async function removeOrderFiles(reference) {
  await rm(resolveInsideStorage(reference), { recursive: true, force: true });
}

export function storedFilePath(reference, storedName) {
  return resolveInsideStorage(reference, storedName);
}
