import { z } from 'zod';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_GALLERY_FILES,
} from './fileConstraints';
import { isValidNationalNumber } from '@/lib/data/countries';

/**
 * Validation messages are CODES, not sentences: "min:50", "tooShort:2",
 * "fileType". The form turns them into the visitor's language via
 * messages/{en,ar}.json (see lib/validation/errorText.ts), and the
 * backend answers with the same codes for the errors it catches — so a
 * customer never sees an English message on the Arabic site.
 */
const code = (name: string, param?: string | number) =>
  param === undefined ? name : `${name}:${param}`;

/**
 * Validates a File instance directly (type/size), rather than only a
 * file *list*. `z.custom` defers the `instanceof File` check until
 * validation actually runs (at submit time, in the browser) rather
 * than at schema-definition time, so this module is safe to import
 * even though the component using it is server-rendered once on the
 * initial request — the `File` global is never touched until a real
 * submit/validate call happens client-side.
 */
function requiredFileSchema() {
  return z
    .custom<File>((val) => val instanceof File, { message: code('fileRequired') })
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), { message: code('fileType') })
    .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, {
      message: code('fileSize', MAX_FILE_SIZE_MB),
    });
}

const optionalImageArraySchema = z
  .array(requiredFileSchema())
  .max(MAX_GALLERY_FILES, code('tooManyFiles', MAX_GALLERY_FILES));

/** Empty-string-safe number field: coerces "" to "required" rather
 * than to 0 (which `z.coerce.number()` would otherwise do, since
 * `Number("")` is 0, not NaN). */
function measurementField(min: number, max: number) {
  return z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.coerce
      .number({ required_error: code('required'), invalid_type_error: code('notNumber') })
      .min(min, code('min', min))
      .max(max, code('max', max))
  );
}

export const customerInfoSchema = z
  .object({
    fullName: z.string().trim().min(2, code('tooShort', 2)),
    mobileCountry: z.string().length(2, code('required')),
    mobileNumber: z.string().trim().min(1, code('required')),
    address: z.string().trim().min(10, code('tooShort', 10)),
    heightCm: measurementField(50, 250),
    weightKg: measurementField(20, 300),
  })
  .superRefine((value, ctx) => {
    if (value.mobileNumber && !isValidNationalNumber(value.mobileCountry, value.mobileNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mobileNumber'],
        message: value.mobileCountry === 'EG' ? code('phoneEg') : code('phone'),
      });
    }
  });

export const measurementsSchema = z.object({
  armLength: measurementField(10, 120),
  shoulderCircumference: measurementField(10, 100),
  blouseLength: measurementField(10, 150),
  trouserLength: measurementField(10, 150),
  hipCircumference: measurementField(20, 200),
  waistCircumference: measurementField(20, 200),
  chestCircumference: measurementField(20, 200),
  thighCircumference: measurementField(10, 150),
  referencePhotos: optionalImageArraySchema,
});

export const scrubCustomizationSchema = z.object({
  shape: z.string().trim().min(2, code('tooShort', 2)),
  material: z.enum(['rosaline', 'angelica'], {
    errorMap: () => ({ message: code('required') }),
  }),
  colorDescription: z.string().trim().min(2, code('tooShort', 2)),
  colorReferenceImage: requiredFileSchema(),
  additionalDetails: z.string().trim().optional(),
  designReferenceImages: optionalImageArraySchema,
});

export const paymentInfoSchema = z.object({
  method: z.enum(['vodafone_cash', 'instapay'], {
    errorMap: () => ({ message: code('selectPayment') }),
  }),
  screenshot: requiredFileSchema(),
});

export const orderFormSchema = z.object({
  customer: customerInfoSchema,
  measurements: measurementsSchema,
  customization: scrubCustomizationSchema,
  payment: paymentInfoSchema,
});

export type ValidatedOrder = z.infer<typeof orderFormSchema>;

/**
 * Flattens Zod issues into a dotted-path -> message map
 * (e.g. "customer.fullName") matching the raw form state's field
 * paths, so a section component can look up its own errors directly.
 */
export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
