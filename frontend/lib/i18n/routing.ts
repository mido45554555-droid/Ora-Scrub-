import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

/**
 * Single routing config shared by proxy.ts (locale detection/redirects)
 * and navigation.ts (locale-aware Link/router), so they can't disagree.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localeDetection: true,
  // next-intl 4 made this a session cookie by default. Keep it for a
  // year so a returning visitor lands back on their last language
  // instead of being re-detected from the browser every time.
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365,
  },
});
