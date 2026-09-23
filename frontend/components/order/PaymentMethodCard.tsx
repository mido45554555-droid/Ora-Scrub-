'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

interface PaymentMethodCardProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  providerName: string;
  accountHolderName: string;
  accountDetails: string;
  logoSrc: string;
  logoAlt: string;
  accountHolderLabel: string;
  accountDetailsLabel: string;
}

/**
 * Accessible "radio card" pattern: a real native <input type="radio">
 * (visually hidden via sr-only, not display:none, so it stays fully
 * keyboard/screen-reader operable) paired with a <label> that renders
 * the entire card. Selection state is styled via the `peer` +
 * `peer-checked:` / `peer-focus-visible:` Tailwind variants, so the
 * whole card is clickable and shows a real focus ring on keyboard
 * navigation even though the input itself isn't visible.
 */
export function PaymentMethodCard({
  id,
  name,
  value,
  checked,
  onSelect,
  providerName,
  accountHolderName,
  accountDetails,
  logoSrc,
  logoAlt,
  accountHolderLabel,
  accountDetailsLabel,
}: PaymentMethodCardProps): import("react").JSX.Element {
  const detailsId = useId();
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="relative">
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="peer sr-only"
        aria-describedby={checked ? detailsId : undefined}
      />
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer flex-col gap-3 rounded border p-4 transition-colors duration-base ease-standard',
          'border-border hover:border-gold-light',
          'peer-checked:border-gold peer-checked:bg-cream',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-cream-white">
            {logoFailed ? (
              <span className="px-1 text-center text-[10px] font-medium leading-tight text-ink-muted">
                {providerName}
              </span>
            ) : (
              <Image
                src={logoSrc}
                alt={logoAlt}
                fill
                sizes="80px"
                className="object-contain p-1"
                onError={() => setLogoFailed(true)}
              />
            )}
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{providerName}</p>
            <p className="text-xs text-ink-muted">
              {accountHolderLabel}: {accountHolderName}
            </p>
          </div>
          <span
            aria-hidden
            className={cn(
              'ms-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
              checked ? 'border-gold bg-gold text-cream-soft' : 'border-border bg-transparent'
            )}
          >
            {checked && (
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                <path
                  d="M3 8.5L6.5 12L13 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </div>

        {checked && (
          <div
            id={detailsId}
            className="border-t border-border pt-3 text-sm text-ink"
          >
            <span className="text-xs font-medium tracking-wide text-ink-muted">
              {accountDetailsLabel}
            </span>
            <p className="numeric-field mt-1">{accountDetails}</p>
          </div>
        )}
      </label>
    </div>
  );
}
