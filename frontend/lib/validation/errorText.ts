/**
 * Turns a validation code ("min:50", "fileSize:5", "required") into a
 * sentence in the visitor's language, using the orderForm.errors.*
 * messages. Codes come from lib/validation/order.ts and from the
 * backend, which uses the same names.
 */
const KNOWN_CODES = new Set([
  'required',
  'notNumber',
  'min',
  'max',
  'tooShort',
  'tooLong',
  'phone',
  'phoneEg',
  'selectPayment',
  'fileRequired',
  'fileType',
  'fileSize',
  'tooManyFiles',
]);

type Translate = (key: string, values?: Record<string, string | number>) => string;

export function errorText(t: Translate, raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  const [code, param] = raw.split(':');
  // Anything unrecognized (e.g. a new backend message) is shown as-is
  // rather than swallowed, so an error is never silently invisible.
  if (!code || !KNOWN_CODES.has(code)) return raw;

  return t(`errors.${code}`, { value: param ?? '' });
}

/** Maps every error in a { "customer.fullName": "min:50" } object. */
export function translateErrors(t: Translate, errors: Record<string, string>) {
  const translated: Record<string, string> = {};
  for (const [path, raw] of Object.entries(errors)) {
    const text = errorText(t, raw);
    if (text) translated[path] = text;
  }
  return translated;
}
