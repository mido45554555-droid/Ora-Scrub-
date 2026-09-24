'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/lib/i18n/navigation';
import { buttonVariants } from '@/components/ui/Button';
import { CustomerInfoSection } from './CustomerInfoSection';
import { MeasurementsSection } from './MeasurementsSection';
import { ScrubCustomizationSection } from './ScrubCustomizationSection';
import { PaymentSection } from './PaymentSection';
import { OrderBasket } from './OrderBasket';
import {
  createInitialOrderFormState,
  type RawOrderFormState,
  type RawScrubCustomization,
} from '@/lib/order/formState';
import { orderFormSchema, flattenZodErrors } from '@/lib/validation/order';
import { translateErrors } from '@/lib/validation/errorText';
import { findCountry, normalizeNationalNumber } from '@/lib/data/countries';
import type { OrderSubmissionResult } from '@/types/order';

type SubmitState = 'idle' | 'invalid' | 'submitting' | 'failed';

/** Multipart body for POST /api/order — see backend/src/routes/orders.js. */
function buildOrderFormData(values: RawOrderFormState, locale: string): FormData {
  const { referencePhotos, ...measurements } = values.measurements;
  const { colorReferenceImage, designReferenceImages, ...customization } = values.customization;

  const formData = new FormData();
  formData.append(
    'data',
    JSON.stringify({
      locale,
      customer: {
        ...values.customer,
        mobileNumber: normalizeNationalNumber(values.customer.mobileCountry, values.customer.mobileNumber),
        mobileDial: findCountry(values.customer.mobileCountry)?.dial ?? '',
      },
      measurements,
      customization: {
        ...customization,
        material: values.customization.material,
      },
      payment: { method: values.payment.method },
    })
  );
  referencePhotos.forEach((file) => formData.append('referencePhotos', file));
  if (colorReferenceImage) formData.append('colorReferenceImage', colorReferenceImage);
  designReferenceImages.forEach((file) => formData.append('designReferenceImages', file));
  if (values.payment.screenshot) formData.append('paymentScreenshot', values.payment.screenshot);
  return formData;
}

/**
 * Owns all form state and validation. `handleSubmit` runs the Zod
 * schema locally for instant feedback, then sends the order to the
 * backend (via the same-origin /api/order proxy), which validates
 * everything again and returns the real order reference.
 */
export function OrderForm() {
  const t = useTranslations('orderForm');
  const locale = useLocale();
  const router = useRouter();
  const [values, setValues] = useState<RawOrderFormState>(
    createInitialOrderFormState
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [failureMessage, setFailureMessage] = useState('');
  const formTopRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function updateCustomer(field: keyof RawOrderFormState['customer'], value: string) {
    setValues((prev) => ({
      ...prev,
      customer: { ...prev.customer, [field]: value },
    }));
  }

  function updateMeasurement(
    field: keyof Omit<RawOrderFormState['measurements'], 'referencePhotos'>,
    value: string
  ) {
    setValues((prev) => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value },
    }));
  }

  function updateReferencePhotos(files: File[]) {
    setValues((prev) => ({
      ...prev,
      measurements: { ...prev.measurements, referencePhotos: files },
    }));
  }

  function updateCustomizationText(
    field: 'shape' | 'colorDescription' | 'additionalDetails',
    value: string
  ) {
    setValues((prev) => ({
      ...prev,
      customization: { ...prev.customization, [field]: value },
    }));
  }

  function updateMaterial(material: RawScrubCustomization['material']) {
    setValues((prev) => ({
      ...prev,
      customization: { ...prev.customization, material },
    }));
  }

  function updateColorImage(file: File | null) {
    setValues((prev) => ({
      ...prev,
      customization: { ...prev.customization, colorReferenceImage: file },
    }));
  }

  function updateDesignImages(files: File[]) {
    setValues((prev) => ({
      ...prev,
      customization: { ...prev.customization, designReferenceImages: files },
    }));
  }

  function updatePaymentMethod(method: string) {
    setValues((prev) => ({
      ...prev,
      payment: { ...prev.payment, method: method as RawOrderFormState['payment']['method'] },
    }));
  }

  function updateScreenshot(file: File | null) {
    setValues((prev) => ({
      ...prev,
      payment: { ...prev.payment, screenshot: file },
    }));
  }

  function showInvalid(fieldErrors: Record<string, string>) {
    // Codes ("min:50") become sentences in the page language here, so
    // the customer never sees an English validation message.
    setErrors(translateErrors(t, fieldErrors));
    setSubmitState('invalid');
    focusFirstError();
  }

  /** Moves the customer straight to the first field that needs fixing. */
  function focusFirstError() {
    window.requestAnimationFrame(() => {
      const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      } else {
        formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function showFailure(message: string) {
    setFailureMessage(message);
    setSubmitState('failed');
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitState === 'submitting') return;

    const result = orderFormSchema.safeParse(values);

    if (!result.success) {
      showInvalid(flattenZodErrors(result.error));
      return;
    }

    setErrors({});
    setSubmitState('submitting');

    let response: Response;
    try {
      response = await fetch('/api/order', {
        method: 'POST',
        body: buildOrderFormData(values, locale),
      });
    } catch {
      showFailure(t('submit.networkError'));
      return;
    }

    const body: unknown = await response.json().catch(() => null);

    if (response.ok) {
      const { orderReference } = body as OrderSubmissionResult;
      router.push(`/order/confirmation?ref=${encodeURIComponent(orderReference)}`);
      return;
    }

    // The backend re-validates everything; its field errors use the same
    // dotted keys as the form ("customer.fullName"), so they land on the
    // right fields.
    const fields = (body as { error?: { fields?: Record<string, string> } } | null)?.error?.fields;
    if (fields && Object.keys(fields).length > 0) {
      showInvalid(fields);
    } else if (response.status === 429) {
      showFailure(t('submit.rateLimited'));
    } else if (response.status === 503) {
      // The backend is at its upload capacity — a "try again shortly",
      // not a failure the customer caused.
      showFailure(t('submit.serverBusy'));
    } else {
      showFailure(t('submit.serverError'));
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate data-order-form>
      <div ref={formTopRef} />

      {submitState === 'invalid' && (
        <p
          role="alert"
          className="mb-8 rounded border-s-4 border-error bg-error-soft px-4 py-3 text-sm font-medium text-error-strong"
        >
          {t('submit.validationSummary')}
        </p>
      )}

      {submitState === 'failed' && (
        <p
          role="alert"
          className="mb-8 rounded border-s-4 border-error bg-error-soft px-4 py-3 text-sm font-medium text-error-strong"
        >
          {failureMessage}
        </p>
      )}

      <CustomerInfoSection
        values={values.customer}
        errors={errors}
        onChange={updateCustomer}
      />

      <MeasurementsSection
        values={values.measurements}
        errors={errors}
        onChange={updateMeasurement}
        onPhotosChange={updateReferencePhotos}
      />

      <ScrubCustomizationSection
        values={values.customization}
        errors={errors}
        onTextChange={updateCustomizationText}
        onMaterialChange={updateMaterial}
        onColorImageChange={updateColorImage}
        onDesignImagesChange={updateDesignImages}
      />

      <PaymentSection
        values={values.payment}
        errors={errors}
        onMethodChange={updatePaymentMethod}
        onScreenshotChange={updateScreenshot}
      />

      <div className="border-t border-border pt-10">
        <button
          type="submit"
          disabled={submitState === 'submitting'}
          className={buttonVariants('primary')}
        >
          {submitState === 'submitting' ? t('submit.submitting') : t('submit.button')}
        </button>
      </div>

      <OrderBasket
        values={values}
        onColorImageChange={updateColorImage}
        onDesignImagesChange={updateDesignImages}
        onReferencePhotosChange={updateReferencePhotos}
        onPaymentMethodChange={updatePaymentMethod}
        onScreenshotChange={updateScreenshot}
      />
    </form>
  );
}
