import { useTranslations } from 'next-intl';
import { TextField } from '@/components/ui/TextField';
import { FileUploadField } from './FileUploadField';
import { FormSection } from './FormSection';
import { MAX_GALLERY_FILES } from '@/lib/validation/fileConstraints';
import { positiveNumberInput } from '@/lib/order/numericInput';
import type { RawMeasurements } from '@/lib/order/formState';

type MeasurementNumericField = keyof Omit<RawMeasurements, 'referencePhotos'>;

interface MeasurementsSectionProps {
  values: RawMeasurements;
  errors: Record<string, string>;
  onChange: (field: MeasurementNumericField, value: string) => void;
  onPhotosChange: (files: File[]) => void;
}

/** Same bounds as lib/validation/order.ts, in display order. */
const MEASUREMENT_RANGES: Record<MeasurementNumericField, [number, number]> = {
  armLength: [10, 120],
  shoulderCircumference: [10, 100],
  blouseLength: [10, 150],
  trouserLength: [10, 150],
  hipCircumference: [20, 200],
  waistCircumference: [20, 200],
  chestCircumference: [20, 200],
  thighCircumference: [10, 150],
};

const NUMERIC_FIELDS = Object.keys(MEASUREMENT_RANGES) as MeasurementNumericField[];

export function MeasurementsSection({
  values,
  errors,
  onChange,
  onPhotosChange,
}: MeasurementsSectionProps) {
  const t = useTranslations('orderForm');
  const tf = useTranslations('orderForm.fields');
  const tu = useTranslations('orderForm.upload');

  return (
    <FormSection
      id="section-measurements"
      index="02"
      title={t('sections.measurements.title')}
      description={t('sections.measurements.description')}
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {NUMERIC_FIELDS.map((field) => (
          <TextField
            key={field}
            label={tf(`${String(field)}.label`)}
            value={values[field]}
            onChange={(e) => onChange(field, positiveNumberInput(e.target.value))}
            error={errors[`measurements.${String(field)}`]}
            requiredLabel={t('requiredLabel')}
            {...positiveNumberInput.props(MEASUREMENT_RANGES[field][0], MEASUREMENT_RANGES[field][1])}
          />
        ))}
      </div>

      <FileUploadField
        label={tf('referencePhotos.label')}
        hint={tf('referencePhotos.hint')}
        optionalLabel={t('optionalLabel')}
        error={errors['measurements.referencePhotos']}
        multiple
        maxFiles={MAX_GALLERY_FILES}
        files={values.referencePhotos}
        onChange={onPhotosChange}
        i18n={{
          remove: (fileName) => tu('remove', { fileName }),
          tooLarge: (fileName) => tu('tooLarge', { fileName }),
          wrongType: (fileName) => tu('wrongType', { fileName }),
          tooMany: tu('tooMany', { max: MAX_GALLERY_FILES }),
        }}
      />
    </FormSection>
  );
}
