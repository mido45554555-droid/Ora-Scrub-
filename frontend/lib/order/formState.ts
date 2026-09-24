import type { PaymentMethod } from '@/types/order';
import { DEFAULT_COUNTRY_ISO } from '@/lib/data/countries';

/**
 * Shape of the actual controlled-input state. Numeric fields are kept
 * as strings here (what a controlled <input> naturally holds) and only
 * coerced to numbers at validation time via the Zod schema — keeping
 * two separate types (raw vs. validated) avoids fighting the input's
 * native string value on every keystroke.
 */
export interface RawCustomerInfo {
  fullName: string;
  /** ISO country code for the phone number, e.g. "EG". */
  mobileCountry: string;
  /** National part only; the dial code comes from mobileCountry. */
  mobileNumber: string;
  address: string;
  heightCm: string;
  weightKg: string;
}

export interface RawMeasurements {
  armLength: string;
  shoulderCircumference: string;
  blouseLength: string;
  trouserLength: string;
  hipCircumference: string;
  waistCircumference: string;
  chestCircumference: string;
  thighCircumference: string;
  referencePhotos: File[];
}

export interface RawScrubCustomization {
  shape: string;
  material: 'rosaline' | 'angelica' | '';
  colorDescription: string;
  colorReferenceImage: File | null;
  additionalDetails: string;
  designReferenceImages: File[];
}

export interface RawPaymentInfo {
  method: PaymentMethod | '';
  screenshot: File | null;
}

export interface RawOrderFormState {
  customer: RawCustomerInfo;
  measurements: RawMeasurements;
  customization: RawScrubCustomization;
  payment: RawPaymentInfo;
}

export function createInitialOrderFormState(): RawOrderFormState {
  return {
    customer: {
      fullName: '',
      mobileCountry: DEFAULT_COUNTRY_ISO,
      mobileNumber: '',
      address: '',
      heightCm: '',
      weightKg: '',
    },
    measurements: {
      armLength: '',
      shoulderCircumference: '',
      blouseLength: '',
      trouserLength: '',
      hipCircumference: '',
      waistCircumference: '',
      chestCircumference: '',
      thighCircumference: '',
      referencePhotos: [],
    },
    customization: {
      shape: '',
      material: '',
      colorDescription: '',
      colorReferenceImage: null,
      additionalDetails: '',
      designReferenceImages: [],
    },
    payment: {
      method: '',
      screenshot: null,
    },
  };
}

export type OrderFormSection = keyof RawOrderFormState;
