interface PlaceholderArtProps {
  variant?: 'top' | 'set';
  className?: string;
}

/**
 * Stands in for real scrub photography, which has not been provided yet.
 * This is an original, independently-drawn abstract linework motif — it
 * does not reuse, crop, or derive from the official logo file in any
 * way, per the instruction not to modify that asset. Swap this out for
 * real photography (via next/image) once it's available; every call
 * site below is written so that's a drop-in replacement.
 */
export function PlaceholderArt({ variant = 'top', className }: PlaceholderArtProps) {
  return (
    <svg
      viewBox="0 0 400 480"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="400" height="480" fill="var(--color-cream)" />
      {variant === 'top' ? (
        <g fill="none" stroke="var(--color-gold-deep)" strokeWidth="1.5">
          <path d="M140 90 L160 70 L200 85 L240 70 L260 90 L290 130 L260 160 L245 140 L245 400 L155 400 L155 140 L140 160 L110 130 Z" />
          <circle cx="200" cy="82" r="10" />
        </g>
      ) : (
        <g fill="none" stroke="var(--color-gold-deep)" strokeWidth="1.5">
          <path d="M160 90 H240 L250 400 H210 L200 220 L190 400 H150 Z" />
          <path d="M160 90 Q200 105 240 90" />
        </g>
      )}
      <circle
        cx="200"
        cy="240"
        r="150"
        fill="none"
        stroke="var(--color-border-gold)"
        strokeWidth="1"
      />
    </svg>
  );
}
