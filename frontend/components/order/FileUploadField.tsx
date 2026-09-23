'use client';

import { useEffect, useId, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { FieldShell } from '@/components/ui/FieldShell';
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from '@/lib/validation/fileConstraints';

interface FileUploadFieldProps {
  label: string;
  hint?: string;
  optionalLabel?: string;
  error?: string;
  required?: boolean;
  requiredLabel?: string;
  multiple?: boolean;
  maxFiles?: number;
  files: File[];
  onChange: (files: File[]) => void;
  /** Localized strings, since this is a shared primitive with no
   * direct next-intl access of its own. */
  i18n: {
    remove: (fileName: string) => string;
    tooLarge: (fileName: string) => string;
    wrongType: (fileName: string) => string;
    tooMany: string;
  };
}

/**
 * Uses a real native <input type="file"> styled via Tailwind's `file:`
 * pseudo-element variants — keeps full native keyboard/screen-reader
 * behavior instead of hiding the input behind a fake styled button.
 * Rejects invalid files immediately (type/size) with inline feedback,
 * in addition to the form-level Zod validation that runs at submit.
 */
export function FileUploadField({
  label,
  hint,
  optionalLabel,
  error,
  required,
  requiredLabel,
  multiple = false,
  maxFiles = 1,
  files,
  onChange,
  i18n,
}: FileUploadFieldProps) {
  const fieldId = useId();
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const [rejections, setRejections] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    // Object URLs are an external resource that must be created and
    // revoked as a pair, so they live in an effect. (Deriving them with
    // useMemo instead breaks previews under StrictMode, which runs this
    // cleanup and then reuses the memoized, already-revoked URLs.)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same file later

    const rejected: string[] = [];
    const accepted: File[] = [];

    for (const file of selected) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        rejected.push(i18n.wrongType(file.name));
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(i18n.tooLarge(file.name));
        continue;
      }
      accepted.push(file);
    }

    const combined = multiple ? [...files, ...accepted] : accepted.slice(0, 1);
    const capped = combined.slice(0, maxFiles);
    if (combined.length > maxFiles) {
      rejected.push(i18n.tooMany);
    }

    setRejections(rejected);
    onChange(capped);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  const atLimit = multiple && files.length >= maxFiles;

  return (
    <FieldShell
      fieldId={fieldId}
      label={label}
      hint={hint}
      error={error}
      optionalLabel={optionalLabel}
      required={required}
      requiredLabel={requiredLabel}
    >
      {!atLimit && (
        <input
          type="file"
          id={fieldId}
          accept={ACCEPTED_IMAGE_EXTENSIONS}
          multiple={multiple}
          onChange={handleFileSelect}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            'w-full cursor-pointer rounded border bg-field p-2 text-sm text-ink-muted',
            'file:me-4 file:cursor-pointer file:rounded file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-medium file:text-cream-soft file:transition-colors file:duration-base file:ease-standard hover:file:bg-gold-shadow',
            error ? 'border-error bg-error-soft' : 'border-field'
          )}
        />
      )}

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="relative h-20 w-20 overflow-hidden rounded border border-border"
            >
              {previews[index] && (
                <Image
                  src={previews[index]}
                  alt={file.name}
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={i18n.remove(file.name)}
                className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs leading-none text-cream-soft"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {rejections.length > 0 && (
        <ul className="flex flex-col gap-1">
          {rejections.map((message) => (
            <li key={message} className="text-sm font-medium text-error">
              ⚠ {message}
            </li>
          ))}
        </ul>
      )}
    </FieldShell>
  );
}
