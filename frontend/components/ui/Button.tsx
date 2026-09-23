import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'primaryOnDark';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Shared variant classnames, exported so link-based CTAs (e.g. the nav
 * "Start your order" link) can look identical to a real <button>
 * without duplicating a second button component.
 *
 * `primaryOnDark` exists as a real variant (not a className override on
 * top of `primary`) because two conflicting Tailwind utilities for the
 * same property don't reliably override each other by string order —
 * only by their order in the compiled stylesheet. Needed wherever a
 * primary CTA sits on a dark/ink-colored section (e.g. FinalCta).
 */
export function buttonVariants(variant: ButtonVariant = 'primary') {
  return cn(
    'inline-flex items-center justify-center rounded px-6 py-3 text-sm font-medium tracking-wide transition-colors duration-base ease-standard disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'primary' && 'bg-ink text-cream-soft hover:bg-gold-shadow',
    variant === 'primaryOnDark' && 'bg-gold text-ink hover:bg-gold-light',
    variant === 'secondary' && 'border border-gold text-ink hover:bg-cream',
    variant === 'ghost' && 'text-ink hover:text-gold-deep'
  );
}

/**
 * Rectangular/near-square radius, sentence-case labels (no all-caps —
 * that's a generic-AI tell per design guidance), restrained hover
 * transition. No shadow — relies on color/border contrast instead of
 * elevation, consistent with the "hairline over shadow" principle.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants(variant), className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
