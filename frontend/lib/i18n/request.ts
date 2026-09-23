import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // Set by setRequestLocale() in the layout/pages (which is what lets
  // them be pre-rendered at build time), or read from the URL segment.
  const locale = await requestLocale;
  if (!locale || !locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
