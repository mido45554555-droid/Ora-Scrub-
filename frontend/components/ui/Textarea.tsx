import { type TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';
import { FieldShell, controlClasses, fieldIds } from './FieldShell';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  optionalLabel?: string;
  requiredLabel?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, optionalLabel, requiredLabel, id, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={fieldId}
          rows={3}
          className={cn(controlClasses(error), 'min-h-[120px] resize-y', className)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
      </FieldShell>
    );
  }
);

Textarea.displayName = 'Textarea';
