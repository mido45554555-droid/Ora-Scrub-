'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/lib/i18n/navigation';

/**
 * Swaps locale while staying on the same page (e.g. /ar/order ->
 * /en/order), and relies on next-intl's own cookie to remember the
 * choice on the next visit — no extra persistence logic needed here.
 */
export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const nextLocale = locale === 'en' ? 'ar' : 'en';

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      className="text-sm font-medium text-ink transition-colors hover:text-gold-deep"
      aria-label={t('switchTo')}
    >
      {t('switchTo')}
    </button>
  );
}
