import type { Config } from 'tailwindcss';

/**
 * All values here reference CSS custom properties defined in
 * app/globals.css — single source of truth. See globals.css header
 * comment for provenance of each token (which are derived from the
 * logo vs. functional/structural choices pending confirmation).
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          light: 'var(--color-gold-light)',
          DEFAULT: 'var(--color-gold)',
          deep: 'var(--color-gold-deep)',
          shadow: 'var(--color-gold-shadow)',
        },
        cream: {
          DEFAULT: 'var(--color-cream)',
          soft: 'rgb(var(--color-cream-soft-rgb) / <alpha-value>)',
          white: 'var(--color-cream-white)',
        },
        ink: {
          DEFAULT: 'rgb(var(--color-ink-rgb) / <alpha-value>)',
          muted: 'var(--color-ink-muted)',
          faint: 'var(--color-ink-faint)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          gold: 'var(--color-border-gold)',
          field: 'var(--color-field-border)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          strong: 'var(--color-error-strong)',
          soft: 'var(--color-error-soft)',
        },
        field: 'var(--color-field)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      spacing: {
        '3xs': 'var(--space-3xs)',
        '2xs': 'var(--space-2xs)',
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        section: 'var(--space-2xl)',
      },
      borderRadius: {
        none: 'var(--radius-none)',
        DEFAULT: 'var(--radius-sm)',
        md: 'var(--radius-md)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
      },
      maxWidth: {
        prose: '65ch',
      },
    },
  },
  plugins: [],
};

export default config;
