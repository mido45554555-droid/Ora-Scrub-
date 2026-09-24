import { z } from 'zod';

/**
 * Server-side copy of the frontend's rules (frontend/lib/validation/
 * order.ts). The browser check is only a convenience — this is the one
 * that actually protects the data, since anyone can bypass the form.
 * Numeric bounds are identical to the frontend's; the frontend doesn't
 * cap text lengths, so the caps here are generous and match the columns
 * in db/schema.sql.
 *
 * Messages are CODES, not sentences ("min:50", "fileType"). The website
 * turns them into Arabic or English (frontend/lib/validation/
 * errorText.ts), so a customer never sees an English message on the
 * Arabic site.
 */
const code = (name, param) => (param === undefined ? name : `${name}:${param}`);

/** Digits allowed in the national part; mirrors the frontend list. */
const NATIONAL_NUMBER_LENGTHS = { EG: [10, 11] };
const DEFAULT_NATIONAL_LENGTH = { min: 6, max: 15 };

// Strips ASCII control characters (keeping tab and newline) so pasted
// junk can't end up in the database or an admin's screen.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function text(max) {
  return z
    .string({ required_error: code('required'), invalid_type_error: code('required') })
    .transform((value) => value.replace(CONTROL_CHARS, '').trim())
    .pipe(z.string().max(max, code('tooLong', max)));
}

function optionalText(max) {
  return z
    .union([text(max), z.null(), z.undefined()])
    .transform((value) => (value ? value : null));
}

/** Accepts "72.5" (what the form sends) or 72.5; "" counts as missing. */
function measurement(min, max) {
  return z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce
      .number({ required_error: code('required'), invalid_type_error: code('notNumber') })
      .finite(code('notNumber'))
      .min(min, code('min', min))
      .max(max, code('max', max))
      .transform((value) => Math.round(value * 10) / 10)
  );
}

/**
 * The form sends the phone in three parts (country, dial code, national
 * number). They're checked here and combined into one stored number
 * like "+20 1012345678"; for Egypt a leading 0 is dropped so the same
 * phone is always stored the same way.
 */
const customerSchema = z
  .object({
    fullName: text(120).pipe(z.string().min(2, code('tooShort', 2))),
    mobileCountry: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, code('required'))
      .default('EG'),
    mobileDial: z
      .string()
      .trim()
      .regex(/^\+\d{1,4}$/, code('phone'))
      .default('+20'),
    mobileNumber: z.string().trim(),
    address: text(500).pipe(z.string().min(10, code('tooShort', 10))),
    heightCm: measurement(50, 250),
    weightKg: measurement(20, 300),
  })
  .superRefine((value, ctx) => {
    const digits = value.mobileNumber.replace(/\D/g, '');
    const allowed = NATIONAL_NUMBER_LENGTHS[value.mobileCountry];
    const valid = allowed
      ? allowed.includes(digits.length)
      : digits.length >= DEFAULT_NATIONAL_LENGTH.min && digits.length <= DEFAULT_NATIONAL_LENGTH.max;

    if (!digits) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mobileNumber'], message: code('required') });
    } else if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mobileNumber'],
        message: code(value.mobileCountry === 'EG' ? 'phoneEg' : 'phone'),
      });
    }
  })
  // The three phone parts collapse into the single stored number.
  .transform(({ mobileCountry, mobileDial, mobileNumber, ...rest }) => {
    const digits = mobileNumber.replace(/\D/g, '');
    const national = mobileCountry === 'EG' ? digits.replace(/^0+/, '') : digits;
    return { ...rest, mobileNumber: `${mobileDial} ${national}` };
  });

export const orderDataSchema = z.object({
  locale: z.enum(['en', 'ar']).default('en'),
  customer: customerSchema,
  measurements: z.object({
    armLength: measurement(10, 120),
    shoulderCircumference: measurement(10, 100),
    blouseLength: measurement(10, 150),
    trouserLength: measurement(10, 150),
    hipCircumference: measurement(20, 200),
    waistCircumference: measurement(20, 200),
    chestCircumference: measurement(20, 200),
    thighCircumference: measurement(10, 150),
  }),
  customization: z.object({
    shape: text(1000).pipe(z.string().min(2, code('tooShort', 2))),
    material: z.enum(['rosaline', 'angelica'], {
      errorMap: () => ({ message: code('required') }),
    }),
    colorDescription: text(1000).pipe(z.string().min(2, code('tooShort', 2))),
    additionalDetails: optionalText(2000),
  }),
  payment: z.object({
    method: z.enum(['vodafone_cash', 'instapay'], {
      errorMap: () => ({ message: code('selectPayment') }),
    }),
  }),
});

/**
 * Multipart file fields, the DB `kind` each is stored as, and the
 * dotted error path the frontend form displays errors under.
 */
export const FILE_FIELDS = {
  referencePhotos: { kind: 'reference_photo', errorPath: 'measurements.referencePhotos', min: 0, max: 4 },
  colorReferenceImage: {
    kind: 'color_reference',
    errorPath: 'customization.colorReferenceImage',
    min: 1,
    max: 1,
    requiredMessage: 'fileRequired',
  },
  designReferenceImages: {
    kind: 'design_reference',
    errorPath: 'customization.designReferenceImages',
    min: 0,
    max: 4,
  },
  paymentScreenshot: {
    kind: 'payment_screenshot',
    errorPath: 'payment.screenshot',
    min: 1,
    max: 1,
    requiredMessage: 'fileRequired',
  },
};

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_TOTAL_FILES = Object.values(FILE_FIELDS).reduce((sum, f) => sum + f.max, 0);

export function flattenZodErrors(error) {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    fields[key] ??= issue.message;
  }
  return fields;
}
