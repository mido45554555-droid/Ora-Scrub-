/**
 * An error that is safe to show to the API caller. Anything thrown that
 * is NOT an HttpError is treated as an internal failure and answered
 * with a generic 500, so internals (SQL, paths, stack traces) never leak.
 */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} code machine-readable, e.g. "VALIDATION_FAILED"
   * @param {string} message human-readable
   * @param {Record<string, string>} [fields] per-field errors, keyed by
   *   the same dotted paths the frontend form uses ("customer.fullName")
   */
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
