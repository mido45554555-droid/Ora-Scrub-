/**
 * Measurements are always positive, so the minus sign is removed as the
 * customer types (a plain `min={0}` only complains on submit, and
 * `type="number"` still lets "-5" be typed). Also strips letters, "e"
 * exponents and extra dots, keeping a single decimal point.
 */
export function positiveNumberInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length > 0 ? `${whole}.${rest.join('').slice(0, 2)}` : (whole ?? '');
}

/** Input attributes that go with it: numeric keypad, no spinner abuse. */
positiveNumberInput.props = (min: number, max: number) =>
  ({
    type: 'text' as const,
    inputMode: 'decimal' as const,
    // The real bounds are enforced by validation; these help browsers
    // and assistive tech announce the expected range.
    'aria-valuemin': min,
    'aria-valuemax': max,
    numeric: true,
    required: true,
    autoComplete: 'off' as const,
  });
