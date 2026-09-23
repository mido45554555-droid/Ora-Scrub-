/**
 * Client-side file constraints, used by both the validation schema and
 * the upload UI (so the accept attribute and the error messages always
 * agree with each other).
 */
export const ACCEPTED_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const ACCEPTED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp';

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Applies to design/reference images and tailor measurement photos.
 * Not specified in the brief for measurement photos specifically —
 * applied the same cap as design images for consistency. Flagged in
 * the Phase 4 report as an assumption. */
export const MAX_GALLERY_FILES = 4;
