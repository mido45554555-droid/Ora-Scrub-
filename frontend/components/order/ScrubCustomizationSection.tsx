import { useTranslations } from 'next-intl';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { FileUploadField } from './FileUploadField';
import { FormSection } from './FormSection';
import { MATERIAL_OPTIONS } from '@/lib/constants';
import { MAX_GALLERY_FILES } from '@/lib/validation/fileConstraints';
import type { RawScrubCustomization } from '@/lib/order/formState';

interface ScrubCustomizationSectionProps {
  values: RawScrubCustomization;
  errors: Record<string, string>;
  onTextChange: (
    field: 'shape' | 'colorDescription' | 'additionalDetails',
    value: string
  ) => void;
  onMaterialChange: (value: RawScrubCustomization['material']) => void;
  onColorImageChange: (file: File | null) => void;
  onDesignImagesChange: (files: File[]) => void;
}

/**
 * Color is deliberately a free-text field + a required reference image
 * — never a fixed dropdown/list. The color reference upload is its own
 * field, kept entirely separate from the general design/reference
 * images (both in the UI and in the underlying form state), per the
 * brief.
 */
export function ScrubCustomizationSection({
  values,
  errors,
  onTextChange,
  onMaterialChange,
  onColorImageChange,
  onDesignImagesChange,
}: ScrubCustomizationSectionProps) {
  const t = useTranslations('orderForm');
  const tf = useTranslations('orderForm.fields');
  const tu = useTranslations('orderForm.upload');

  return (
    <FormSection
      id="section-customization"
      index="03"
      title={t('sections.customization.title')}
      description={t('sections.customization.description')}
    >
      <TextField
        label={tf('shape.label')}
        hint={tf('shape.hint')}
        value={values.shape}
        onChange={(e) => onTextChange('shape', e.target.value)}
        error={errors['customization.shape']}
        requiredLabel={t('requiredLabel')}
        required
      />

      <fieldset
        aria-invalid={Boolean(errors['customization.material'])}
        className="flex flex-col gap-3"
      >
        <legend className="text-sm font-medium text-ink">
          <span>
            {tf('material.label')}
            <span aria-hidden className="text-error"> {' *'}</span>
          </span>
        </legend>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {MATERIAL_OPTIONS.map((option) => {
            const checked = values.material === option.value;
            const label = tf(`material.${option.value}`);

            return (
              <label
                key={option.value}
                className={[
                  'group relative flex w-full min-w-[160px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-base ease-standard sm:w-auto',
                  checked
                    ? 'border-gold bg-cream-soft text-ink shadow-sm ring-2 ring-gold/20'
                    : 'border-gold/40 bg-field text-ink-muted hover:border-gold/70 hover:bg-cream-soft/60',
                  errors['customization.material'] ? 'border-error bg-error-soft' : '',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="material"
                  value={option.value}
                  checked={checked}
                  onChange={() => onMaterialChange(option.value as RawScrubCustomization['material'])}
                  className="peer sr-only"
                />
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gold bg-transparent transition-colors group-hover:border-gold-deep">
                  <span
                    className={[
                      'h-2.5 w-2.5 rounded-full bg-gold transition-transform duration-base',
                      checked ? 'scale-100' : 'scale-0',
                    ].join(' ')}
                  />
                </span>
                <span className="flex-1 text-start">{label}</span>
              </label>
            );
          })}
        </div>
        {errors['customization.material'] && (
          <p className="text-sm font-medium text-error">{errors['customization.material']}</p>
        )}
      </fieldset>

      <TextField
        label={tf('colorDescription.label')}
        hint={tf('colorDescription.hint')}
        value={values.colorDescription}
        onChange={(e) => onTextChange('colorDescription', e.target.value)}
        error={errors['customization.colorDescription']}
        requiredLabel={t('requiredLabel')}
        required
      />

      <FileUploadField
        label={tf('colorReferenceImage.label')}
        hint={tf('colorReferenceImage.hint')}
        error={errors['customization.colorReferenceImage']}
        requiredLabel={t('requiredLabel')}
        required
        files={values.colorReferenceImage ? [values.colorReferenceImage] : []}
        onChange={(files) => onColorImageChange(files[0] ?? null)}
        i18n={{
          remove: (fileName) => tu('remove', { fileName }),
          tooLarge: (fileName) => tu('tooLarge', { fileName }),
          wrongType: (fileName) => tu('wrongType', { fileName }),
          tooMany: tu('tooMany', { max: 1 }),
        }}
      />

      <Textarea
        label={tf('additionalDetails.label')}
        hint={tf('additionalDetails.hint')}
        optionalLabel={t('optionalLabel')}
        value={values.additionalDetails}
        onChange={(e) => onTextChange('additionalDetails', e.target.value)}
        error={errors['customization.additionalDetails']}
      />

      <FileUploadField
        label={tf('designReferenceImages.label')}
        hint={tf('designReferenceImages.hint')}
        optionalLabel={t('optionalLabel')}
        error={errors['customization.designReferenceImages']}
        multiple
        maxFiles={MAX_GALLERY_FILES}
        files={values.designReferenceImages}
        onChange={onDesignImagesChange}
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
