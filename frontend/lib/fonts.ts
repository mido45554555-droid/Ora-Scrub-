import { Cormorant, IBM_Plex_Sans, Amiri, IBM_Plex_Sans_Arabic } from 'next/font/google';

/**
 * Typography system — see Phase 2 report for the reasoning. Summary:
 *
 * Display (headings, brand-facing moments):
 *   EN → Cormorant (refined serif, echoes the logo's own thin-stroke
 *        serif wordmark and its high contrast between thick/thin strokes)
 *   AR → Amiri (a classical Naskh-revival serif with the same "bookish,
 *        editorial" register as Cormorant — chosen specifically so the
 *        two don't feel like two different brands stitched together)
 *
 * Body/UI (everything else):
 *   EN → IBM Plex Sans
 *   AR → IBM Plex Sans Arabic
 *   These two are literally designed as siblings within the same type
 *   family, so x-height, spacing, and weight all correspond directly —
 *   the strongest possible EN/AR coherence for functional text.
 *
 * All four are loaded via next/font/google: self-hosted at build time,
 * no runtime request to Google Fonts, subset to the scripts actually
 * used, and swap-safe (no invisible-text flash).
 */

export const displayEn = Cormorant({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-display-en',
  display: 'swap',
});

export const displayAr = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-display-ar',
  display: 'swap',
});

export const bodyEn = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body-en',
  display: 'swap',
});

export const bodyAr = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-body-ar',
  display: 'swap',
});

export const fontVariables = [
  displayEn.variable,
  displayAr.variable,
  bodyEn.variable,
  bodyAr.variable,
].join(' ');
