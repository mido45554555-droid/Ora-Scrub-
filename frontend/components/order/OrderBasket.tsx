'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { PAYMENT_ACCOUNTS } from '@/lib/constants';
import { findCountry } from '@/lib/data/countries';
import { FileUploadField } from './FileUploadField';
import { PaymentMethodCard } from './PaymentMethodCard';
import type { RawOrderFormState } from '@/lib/order/formState';

interface OrderBasketProps {
  values: RawOrderFormState;
  onColorImageChange: (file: File | null) => void;
  onDesignImagesChange: (files: File[]) => void;
  onReferencePhotosChange: (files: File[]) => void;
  onPaymentMethodChange: (method: string) => void;
  onScreenshotChange: (file: File | null) => void;
}

/**
 * A small "review your order" drawer, not a shopping cart — this
 * project only ever has one custom order in progress, so there's
 * nothing to add/remove as line items. It exists so the customer can
 * see everything they've entered in one place before submitting, jump
 * back to a specific form section to fix a text field, or replace/
 * remove an uploaded image directly without hunting through the form.
 *
 * All state stays exactly where OrderForm already keeps it — this
 * component receives the same values and the same update callbacks
 * OrderForm already passes to the section components, so selecting a
 * payment method or removing a photo here updates the identical state
 * the main form reads from. Nothing is duplicated or persisted
 * separately, and nothing is sent anywhere; this is still entirely
 * pre-submission, client-side review.
 */
export function OrderBasket({
  values,
  onColorImageChange,
  onDesignImagesChange,
  onReferencePhotosChange,
  onPaymentMethodChange,
  onScreenshotChange,
}: OrderBasketProps) {
  const t = useTranslations('orderForm.basket');
  const tf = useTranslations('orderForm.fields');
  const tSections = useTranslations('orderForm.sections');
  const tu = useTranslations('orderForm.upload');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeBasket();
        return;
      }

      if (e.key !== 'Tab' || !panelRef.current) return;

      // Basic focus trap: aria-modal="true" tells assistive tech the
      // rest of the page is inert, so Tab must not actually be able to
      // leave the dialog while it's open.
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function closeBasket() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function editSection(sectionId: string) {
    setOpen(false);
    // A short delay lets the drawer's own close transition start before
    // the page scrolls, so the two animations don't visually fight.
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 150);
  }

  const fileI18n = {
    remove: (fileName: string) => tu('remove', { fileName }),
    tooLarge: (fileName: string) => tu('tooLarge', { fileName }),
    wrongType: (fileName: string) => tu('wrongType', { fileName }),
  };

  const summaryRow = (label: string, value: string) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-ink-faint">{label}</span>
      <span className={cn('text-sm', value ? 'text-ink' : 'text-ink-faint italic')}>
        {value || t('emptyValue')}
      </span>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('trigger')}
        className="fixed bottom-6 end-6 z-40 flex h-12 w-12 items-center justify-center gap-2 rounded-full border border-gold bg-cream-soft text-sm font-medium text-ink shadow-md transition-colors duration-base ease-standard hover:bg-cream sm:h-auto sm:w-auto sm:px-5 sm:py-3"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
          <path
            d="M4 7h16M7 7V5.5A2.5 2.5 0 0 1 9.5 3h5A2.5 2.5 0 0 1 17 5.5V7m-11 0 1 12.5A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.9L18 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="hidden sm:inline">{t('trigger')}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 transition-opacity duration-base ease-standard"
          onClick={closeBasket}
          aria-hidden
        />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-basket-title"
        tabIndex={-1}
        // While closed the panel is only moved off-screen, so without
        // this its inputs and buttons would still be reachable by Tab
        // and announced by screen readers.
        inert={!open}
        className={cn(
          'fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col bg-cream-soft shadow-md transition-transform duration-base ease-standard',
          open ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 id="order-basket-title" className="font-display text-xl text-ink">
            {t('title')}
          </h2>
          <button
            type="button"
            onClick={closeBasket}
            aria-label={t('close')}
            className="flex h-8 w-8 items-center justify-center text-ink hover:text-gold-deep"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
              <path
                d="M2 2l12 12M14 2 2 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Customer info — read-only summary, edit jumps back to the form */}
          <section className="border-b border-border pb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium tracking-wide text-ink-muted">
                {tSections('customer.title')}
              </h3>
              <button
                type="button"
                onClick={() => editSection('section-customer')}
                className="text-xs font-medium text-gold-deep hover:text-gold-shadow"
              >
                {t('edit')}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {summaryRow(tf('fullName.label'), values.customer.fullName)}
              {summaryRow(
                tf('mobileNumber.label'),
                values.customer.mobileNumber
                  ? `${findCountry(values.customer.mobileCountry)?.dial ?? ''} ${values.customer.mobileNumber}`
                  : ''
              )}
              <div className="col-span-2">
                {summaryRow(tf('address.label'), values.customer.address)}
              </div>
              {summaryRow(tf('height.label'), values.customer.heightCm)}
              {summaryRow(tf('weight.label'), values.customer.weightKg)}
            </div>
          </section>

          {/* Measurements — read-only summary, edit jumps back to the form */}
          <section className="border-b border-border py-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium tracking-wide text-ink-muted">
                {tSections('measurements.title')}
              </h3>
              <button
                type="button"
                onClick={() => editSection('section-measurements')}
                className="text-xs font-medium text-gold-deep hover:text-gold-shadow"
              >
                {t('edit')}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {summaryRow(tf('armLength.label'), values.measurements.armLength)}
              {summaryRow(
                tf('shoulderCircumference.label'),
                values.measurements.shoulderCircumference
              )}
              {summaryRow(tf('blouseLength.label'), values.measurements.blouseLength)}
              {summaryRow(tf('trouserLength.label'), values.measurements.trouserLength)}
              {summaryRow(tf('hipCircumference.label'), values.measurements.hipCircumference)}
              {summaryRow(
                tf('waistCircumference.label'),
                values.measurements.waistCircumference
              )}
              {summaryRow(
                tf('chestCircumference.label'),
                values.measurements.chestCircumference
              )}
              {summaryRow(
                tf('thighCircumference.label'),
                values.measurements.thighCircumference
              )}
            </div>
            <div className="mt-4">
              <FileUploadField
                label={tf('referencePhotos.label')}
                multiple
                maxFiles={4}
                files={values.measurements.referencePhotos}
                onChange={onReferencePhotosChange}
                i18n={{ ...fileI18n, tooMany: tu('tooMany', { max: 4 }) }}
              />
            </div>
          </section>

          {/* Customization — text fields jump back to the form; images are
              directly replaceable/removable right here. */}
          <section className="border-b border-border py-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium tracking-wide text-ink-muted">
                {tSections('customization.title')}
              </h3>
              <button
                type="button"
                onClick={() => editSection('section-customization')}
                className="text-xs font-medium text-gold-deep hover:text-gold-shadow"
              >
                {t('edit')}
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              {summaryRow(tf('shape.label'), values.customization.shape)}
              {summaryRow(
                tf('colorDescription.label'),
                values.customization.colorDescription
              )}
              {summaryRow(
                tf('additionalDetails.label'),
                values.customization.additionalDetails
              )}
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <FileUploadField
                label={tf('colorReferenceImage.label')}
                files={
                  values.customization.colorReferenceImage
                    ? [values.customization.colorReferenceImage]
                    : []
                }
                onChange={(files) => onColorImageChange(files[0] ?? null)}
                i18n={{ ...fileI18n, tooMany: tu('tooMany', { max: 1 }) }}
              />
              <FileUploadField
                label={tf('designReferenceImages.label')}
                multiple
                maxFiles={4}
                files={values.customization.designReferenceImages}
                onChange={onDesignImagesChange}
                i18n={{ ...fileI18n, tooMany: tu('tooMany', { max: 4 }) }}
              />
            </div>
          </section>

          {/* Payment — method and screenshot are both directly editable here. */}
          <section className="py-6">
            <h3 className="text-sm font-medium tracking-wide text-ink-muted">
              {tSections('payment.title')}
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3">
              {(['vodafone_cash', 'instapay'] as const).map((method) => {
                const account = PAYMENT_ACCOUNTS[method];
                const providerName =
                  method === 'vodafone_cash' ? tf('vodafoneCash') : tf('instapay');
                return (
                  <PaymentMethodCard
                    key={method}
                    id={`basket-payment-method-${method}`}
                    name="basket-payment-method"
                    value={method}
                    checked={values.payment.method === method}
                    onSelect={onPaymentMethodChange}
                    providerName={providerName}
                    accountHolderName={account.accountHolderName}
                    accountDetails={account.accountDetails}
                    logoSrc={account.logoSrc}
                    logoAlt={tf('paymentMethod.logoAlt', { provider: providerName })}
                    accountHolderLabel={tf('paymentMethod.accountHolderLabel')}
                    accountDetailsLabel={tf('paymentMethod.accountDetailsLabel')}
                  />
                );
              })}
            </div>
            <div className="mt-4">
              <FileUploadField
                label={tf('screenshot.label')}
                files={values.payment.screenshot ? [values.payment.screenshot] : []}
                onChange={(files) => onScreenshotChange(files[0] ?? null)}
                i18n={{ ...fileI18n, tooMany: tu('tooMany', { max: 1 }) }}
              />
            </div>
          </section>
        </div>

        <div className="border-t border-border px-6 py-5">
          <button
            type="button"
            onClick={closeBasket}
            className="w-full rounded bg-ink px-6 py-3 text-sm font-medium tracking-wide text-cream-soft transition-colors duration-base ease-standard hover:bg-gold-shadow"
          >
            {t('continueEditing')}
          </button>
        </div>
      </div>
    </>
  );
}
