'use client';

import { useId, useMemo, useSyncExternalStore } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/cn';
import { COUNTRIES, flagEmoji, findCountry } from '@/lib/data/countries';
import { FieldShell, controlClasses, fieldIds } from './FieldShell';

const subscribeToHydration = () => () => { };
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

interface PhoneFieldProps {
  label: string;
  hint?: string;
  error?: string;
  requiredLabel?: string;
  countryLabel: string;
  /** Example number shown in the empty field, e.g. "01012345678". */
  placeholder?: string;
  /** ISO country code, e.g. "EG". */
  country: string;
  number: string;
  onCountryChange: (iso: string) => void;
  onNumberChange: (value: string) => void;
}

/**
 * Country dial code + national number. A real <select> (not a custom
 * dropdown) so it uses the phone's native picker and keyboard
 * type-ahead. Country names come from Intl.DisplayNames in the page's
 * language after hydration, avoiding server/browser locale-data mismatches
 * without maintaining a translated country list.
 */
export function PhoneField({
  label,
  hint,
  error,
  requiredLabel,
  countryLabel,
  placeholder,
  country,
  number,
  onCountryChange,
  onNumberChange,
}: PhoneFieldProps) {
  const locale = useLocale();
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  );
  const fieldId = useId();
  const selectId = `${fieldId}-country`;
  const { describedBy } = fieldIds(fieldId, hint, error);

  const options = useMemo(() => {
    let displayNames: Intl.DisplayNames | undefined;
    if (hasHydrated) {
      try {
        displayNames = new Intl.DisplayNames([locale], { type: 'region' });
      } catch {
        displayNames = undefined;
      }
    }

    // Keep ISO source order stable while labels change after hydration.
    return COUNTRIES.map((entry) => ({
      ...entry,
      name: displayNames?.of(entry.iso) ?? entry.iso,
    }));
  }, [hasHydrated, locale]);

  const selected = findCountry(country);

  return (
    <FieldShell
      fieldId={fieldId}
      label={label}
      hint={hint}
      error={error}
      required
      requiredLabel={requiredLabel}
    >
      <div className="flex gap-2">
        {/* The small box shows only the flag + dial code. The full
            country names still exist in the dropdown, so the list stays
            usable; the closed control keeps its own text transparent and
            paints the short version over it. */}
        <div className="relative w-24 shrink-0">
          <select
            id={selectId}
            aria-label={countryLabel}
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            className={cn(
              controlClasses(error),
              'h-full w-full cursor-pointer px-2 text-transparent'
            )}
          >
            {options.map((entry) => (
              // Colors set inline (not inherited): the closed control's
              // own text is transparent, and options must stay readable
              // in the open list.
              <option
                key={entry.iso}
                value={entry.iso}
                style={{ color: '#2b2621', backgroundColor: '#fbf7f2' }}
              >
                {flagEmoji(entry.iso)} {entry.name} ({entry.dial})
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-0 flex w-full items-center gap-1 px-2 text-sm text-ink"
          >
            <span>{flagEmoji(country)}</span>
            <span className="numeric-field">{selected?.dial}</span>
            <svg viewBox="0 0 12 8" className="ms-auto h-2 w-2.5 shrink-0 text-ink-muted" fill="none">
              <path d="M1 1.5 6 6.5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <input
          id={fieldId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          placeholder={placeholder}
          // Digits, spaces and dashes only — letters can't be typed.
          onChange={(e) => onNumberChange(e.target.value.replace(/[^\d\s-]/g, ''))}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required
          className={cn(controlClasses(error), 'numeric-field flex-1')}
        />
      </div>
    </FieldShell>
  );
}
