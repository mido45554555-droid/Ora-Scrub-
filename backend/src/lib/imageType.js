import { open } from 'node:fs/promises';

/**
 * Identifies an image from its first bytes ("magic numbers"). The
 * browser-supplied MIME type and file extension are both
 * attacker-controlled, so they're never trusted for what gets stored or
 * served back — only the detected type is.
 */
const SIGNATURES = [
  {
    mime: 'image/jpeg',
    extension: 'jpg',
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    extension: 'png',
    matches: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: 'image/webp',
    extension: 'webp',
    // "RIFF" <4-byte size> "WEBP"
    matches: (b) =>
      b.length >= 12 &&
      b.toString('ascii', 0, 4) === 'RIFF' &&
      b.toString('ascii', 8, 12) === 'WEBP',
  },
];

/** @returns {{ mime: string, extension: string } | null} */
export function detectImageType(buffer) {
  const match = SIGNATURES.find((signature) => signature.matches(buffer));
  return match ? { mime: match.mime, extension: match.extension } : null;
}

/** Longest signature is 12 bytes ("RIFF" + size + "WEBP"). */
export const SIGNATURE_BYTES = 12;

/**
 * Same check for a file on disk: reads only the first bytes, so an
 * upload never has to be held in memory to be identified.
 */
export async function detectImageTypeFromFile(filePath) {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(SIGNATURE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, SIGNATURE_BYTES, 0);
    return detectImageType(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}
