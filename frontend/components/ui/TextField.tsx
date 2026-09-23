import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';
import { FieldShell, controlClasses, fieldIds } from './FieldShell';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Marks the field's value as always-LTR (e.g. measurements, phone
   * numbers) regardless of surrounding page direction. */
  numeric?: boolean;
  error?: string;
  hint?: string;
  /** Localized "Optional" label text — pass this in from the caller
   * (translated) rather than hardcoding English here. Omit for
   * required fields. */
  optionalLabel?: string;
  /** Localized word for the required marker, announced to screen readers. */
  requiredLabel?: string;
}

/**
 * Boxed input with a visible border and white background, so an empty
 * field is obviously something to fill in. Errors turn the box red and
 * print the reason underneath; hint and error are both wired to the
 * input via aria-describedby, with aria-invalid reflecting the state.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    { className, label, numeric, error, hint, optionalLabel, requiredLabel, id, ...props },
    ref
  ) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const { describedBy } = fieldIds(fieldId, hint, error);

    return (
      <FieldShell
        fieldId={fieldId}
        label={label}
        hint={hint}
        error={error}
        optionalLabel={optionalLabel}
        required={props.required}
        requiredLabel={requiredLabel}
      >
        <input
          ref={ref}
          id={fieldId}
          className={cn(controlClasses(error), numeric && 'numeric-field', className)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
      </FieldShell>
    );
  }
);

TextField.displayName = 'TextField';
