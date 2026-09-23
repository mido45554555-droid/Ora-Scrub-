type ClassValue = string | number | boolean | null | undefined;

/**
 * Minimal className joiner. Deliberately not pulling in `clsx` +
 * `tailwind-merge` for a two-line utility — keeps dependencies lean per
 * the "avoid unnecessary dependencies" rule. Revisit if variant logic
 * grows complex enough to need real conflict resolution.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
