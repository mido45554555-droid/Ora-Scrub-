import { useTranslations } from 'next-intl';
import { TextField } from '@/components/ui/TextField';
import { Textarea } from '@/components/ui/Textarea';
import { FileUploadField } from './FileUploadField';
import { FormSection } from './FormSection';
import { MAX_GALLERY_FILES } from '@/lib/validation/fileConstraints';
import type { RawScrubCustomization } from '@/lib/order/formState';

interface ScrubCustomizationSectionProps {
  values: RawScrubCustomization;
  errors: Record<string, string>;
  onTextChange: (
    field: 'shape' | 'colorDescription' | 'additionalDetails',
    value: string
  ) => void;
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

      <TextField
        label={tf('colorDescription.label')}
        hint={tf('colorDescription.hint')}
        optionalLabel={t('optionalLabel')}
        value={values.colorDescription}
        onChange={(e) => onTextChange('colorDescription', e.target.value)}
        error={errors['customization.colorDescription']}
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
