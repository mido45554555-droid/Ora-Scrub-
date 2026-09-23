import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, direction, type Locale } from '@/lib/i18n/config';
import { fontVariables } from '@/lib/fonts';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import '../globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Brand name/tagline in <title> come from messages (brand.name /
// brand.tagline) rather than a hardcoded string, so both locales stay
// in sync automatically once official Arabic brand text is finalized.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'brand' });

  return {
    title: `${t('name')} — ${t('tagline')}`,
    description:
      locale === 'ar'
        ? 'أزياء طبية فاخرة مصممة خصيصًا للأطباء والتمريض.'
        : 'Premium custom medical scrubs for doctors and nurses.',
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Lets next-intl know the locale without reading request headers, so
  // pages can be pre-rendered at build time (see generateStaticParams).
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = direction(locale as Locale);

  return (
    // data-scroll-behavior keeps page-to-page navigation instant while
    // in-page links (e.g. the order basket's "Edit") still scroll
    // smoothly — Next.js 16 no longer does this by default.
    <html lang={locale} dir={dir} className={fontVariables} data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col font-body">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
