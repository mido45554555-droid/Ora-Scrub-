/**
 * Config-driven option lists for the order form. Kept as data rather
 * than hardcoded in components, so populating real options later is a
 * data change, not a code change.
 */

export interface LocalizedOption {
  value: string;
  label: { en: string; ar: string };
}

/**
 * Material type choices — intentionally empty. The client will provide
 * the actual material list later; until then the field should render as
 * hidden or disabled in the order form (decide which when the form is
 * built), never with invented material names.
 */
export const MATERIAL_OPTIONS: LocalizedOption[] = [];

/**
 * Scrub shape/model choices — also pending. Not yet provided by the
 * client, so left empty rather than guessed.
 */
export const SCRUB_SHAPE_OPTIONS: LocalizedOption[] = [];

/**
 * Real payment account details — PLACEHOLDER VALUES ONLY.
 *
 * The client will provide the real Vodafone Cash number and InstaPay
 * account/details later. Update just the two constants below; nothing
 * else needs to change (the payment UI reads from PAYMENT_ACCOUNTS,
 * never hardcodes a number itself).
 */
export const VODAFONE_CASH_NUMBER = '01xxxxxxxxx'; // TODO: replace with the real Vodafone Cash number
export const INSTAPAY_ACCOUNT = 'ora@instapay'; // TODO: replace with the real InstaPay account/details

export interface PaymentAccountConfig {
  /** Account holder name exactly as it should be displayed to the customer. */
  accountHolderName: string;
  /** The number (Vodafone Cash) or handle/details (InstaPay) to pay to. */
  accountDetails: string;
  /** Path under /public for the provider's logo. */
  logoSrc: string;
}

export const PAYMENT_ACCOUNTS: Record<'vodafone_cash' | 'instapay', PaymentAccountConfig> = {
  vodafone_cash: {
    accountHolderName: 'دعاء',
    accountDetails: VODAFONE_CASH_NUMBER,
    logoSrc: '/assets/payments/vodafone-cash.jpg',
  },
  instapay: {
    accountHolderName: 'عبدالله',
    accountDetails: INSTAPAY_ACCOUNT,
    logoSrc: '/assets/payments/instapay.png',
  },
};
