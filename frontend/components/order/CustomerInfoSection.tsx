import { useTranslations } from 'next-intl';
import { TextField } from '@/components/ui/TextField';
import { PhoneField } from '@/components/ui/PhoneField';
import { FormSection } from './FormSection';
import { positiveNumberInput } from '@/lib/order/numericInput';
import type { RawCustomerInfo } from '@/lib/order/formState';

interface CustomerInfoSectionProps {
  values: RawCustomerInfo;
  errors: Record<string, string>;
  onChange: (field: keyof RawCustomerInfo, value: string) => void;
}

export function CustomerInfoSection({
  values,
  errors,
  onChange,
}: CustomerInfoSectionProps) {
  const t = useTranslations('orderForm');
  const tf = useTranslations('orderForm.fields');

  return (
    <FormSection
      id="section-customer"
      index="01"
      title={t('sections.customer.title')}
      description={t('sections.customer.description')}
    >
      <TextField
        label={tf('fullName.label')}
        value={values.fullName}
        onChange={(e) => onChange('fullName', e.target.value)}
        error={errors['customer.fullName']}
        autoComplete="name"
        requiredLabel={t('requiredLabel')}
        required
      />
      <PhoneField
        label={tf('mobileNumber.label')}
        hint={tf('mobileNumber.hint')}
        countryLabel={tf('mobileNumber.countryLabel')}
        placeholder={tf('mobileNumber.placeholder')}
        requiredLabel={t('requiredLabel')}
        country={values.mobileCountry}
        number={values.mobileNumber}
        onCountryChange={(iso) => onChange('mobileCountry', iso)}
        onNumberChange={(value) => onChange('mobileNumber', value)}
        error={errors['customer.mobileNumber'] ?? errors['customer.mobileCountry']}
      />
      <TextField
        label={tf('address.label')}
        hint={tf('address.hint')}
        value={values.address}
        onChange={(e) => onChange('address', e.target.value)}
        error={errors['customer.address']}
        autoComplete="street-address"
        requiredLabel={t('requiredLabel')}
        required
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TextField
          label={tf('height.label')}
          value={values.heightCm}
          onChange={(e) => onChange('heightCm', positiveNumberInput(e.target.value))}
          error={errors['customer.heightCm']}
          requiredLabel={t('requiredLabel')}
          {...positiveNumberInput.props(50, 250)}
        />
        <TextField
          label={tf('weight.label')}
          value={values.weightKg}
          onChange={(e) => onChange('weightKg', positiveNumberInput(e.target.value))}
          error={errors['customer.weightKg']}
          requiredLabel={t('requiredLabel')}
          {...positiveNumberInput.props(20, 300)}
        />
      </div>
    </FormSection>
  );
}
