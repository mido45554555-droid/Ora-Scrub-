import { useTranslations } from 'next-intl';
import { PaymentMethodCard } from './PaymentMethodCard';
import { FileUploadField } from './FileUploadField';
import { FormSection } from './FormSection';
import { PAYMENT_ACCOUNTS } from '@/lib/constants';
import type { RawPaymentInfo } from '@/lib/order/formState';

interface PaymentSectionProps {
  values: RawPaymentInfo;
  errors: Record<string, string>;
  onMethodChange: (method: string) => void;
  onScreenshotChange: (file: File | null) => void;
}

const METHODS = ['vodafone_cash', 'instapay'] as const;

export function PaymentSection({
  values,
  errors,
  onMethodChange,
  onScreenshotChange,
}: PaymentSectionProps) {
  const t = useTranslations('orderForm');
  const tf = useTranslations('orderForm.fields');
  const tu = useTranslations('orderForm.upload');

  const errorId = errors['payment.method'] ? 'payment-method-error' : undefined;

  return (
    <FormSection
      id="section-payment"
      index="04"
      title={t('sections.payment.title')}
      description={t('sections.payment.description')}
    >
      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={errorId}
        aria-invalid={Boolean(errors['payment.method'])}
      >
        <legend className="text-sm font-medium text-ink">
          {tf('paymentMethod.legend')}
          <span aria-hidden className="text-error">{' *'}</span>
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {METHODS.map((method) => {
            const account = PAYMENT_ACCOUNTS[method];
            const providerName =
              method === 'vodafone_cash' ? tf('vodafoneCash') : tf('instapay');

            return (
              <PaymentMethodCard
                key={method}
                id={`payment-method-${method}`}
                name="payment-method"
                value={method}
                checked={values.method === method}
                onSelect={onMethodChange}
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

        {errors['payment.method'] && (
          <p id={errorId} className="text-sm font-medium text-error">
            ⚠ {errors['payment.method']}
          </p>
        )}
      </fieldset>

      <FileUploadField
        label={tf('screenshot.label')}
        hint={tf('screenshot.hint')}
        error={errors['payment.screenshot']}
        requiredLabel={t('requiredLabel')}
        required
        files={values.screenshot ? [values.screenshot] : []}
        onChange={(files) => onScreenshotChange(files[0] ?? null)}
        i18n={{
          remove: (fileName) => tu('remove', { fileName }),
          tooLarge: (fileName) => tu('tooLarge', { fileName }),
          wrongType: (fileName) => tu('wrongType', { fileName }),
          tooMany: tu('tooMany', { max: 1 }),
        }}
      />
    </FormSection>
  );
}
