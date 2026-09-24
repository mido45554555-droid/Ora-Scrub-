import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Label + hint + error wrapper shared by every form control, so the
 * label style, the required marker, the red error line and the
 * aria-describedby wiring are identical everywhere.
 */
export interface FieldShellProps {
  fieldId: string;
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  required?: boolean;
  /** Screen-reader text for the "*" marker, e.g. "required". */
  requiredLabel?: string;
  children: ReactNode;
}

export function fieldIds(fieldId: string, hint?: string, error?: string) {
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  return {
    hintId,
    errorId,
    describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined,
  };
}

/** Border/background of a text input, select or textarea. */
export function controlClasses(error?: string) {
  return cn(
    'block w-full min-h-[44px] appearance-none rounded border border-[1.5px] bg-field px-3 py-2.5 text-base text-ink shadow-none outline-none transition-colors duration-base ease-standard placeholder:text-ink-faint',
    'disabled:cursor-not-allowed disabled:bg-cream-soft disabled:text-ink-muted',
    'focus:border-gold focus:ring-2 focus:ring-gold/30',
    'selection:bg-gold/20',
    error ? 'border-error bg-error-soft focus:border-error focus:ring-error/25' : 'border-gold/40'
  );
}

export function FieldShell({
  fieldId,
  label,
  hint,
  error,
  optionalLabel,
  required,
  requiredLabel,
  children,
}: FieldShellProps) {
  const { hintId, errorId } = fieldIds(fieldId, hint, error);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink"
      >
        <span>
          {label}
          {required && (
            <>
              <span aria-hidden className="text-error">
                {' *'}
              </span>
              {requiredLabel && <span className="sr-only"> ({requiredLabel})</span>}
            </>
          )}
        </span>
        {optionalLabel && (
          <span className="text-xs font-normal text-ink-faint">{optionalLabel}</span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-xs text-ink-faint">
          {hint}
        </p>
      )}

      {children}

      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-error">
          <span aria-hidden className="mt-px leading-none">
            ⚠
          </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
