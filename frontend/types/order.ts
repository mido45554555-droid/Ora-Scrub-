/**
 * Shared order types. The form's own state types live in
 * lib/order/formState.ts; the full submission contract is defined and
 * validated by the backend (../backend/src/validation/order.js).
 */

export type PaymentMethod = 'vodafone_cash' | 'instapay';

/** Successful response from POST /api/order. */
export interface OrderSubmissionResult {
  orderReference: string;
  status: 'success';
}
