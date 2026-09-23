import { useTranslations } from 'next-intl';
import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Section, Container } from '@/components/ui/Section';
import { Link } from '@/lib/i18n/navigation';
import { buttonVariants } from '@/components/ui/Button';

/**
 * Reads ?ref= from the URL: the order reference the backend returned
 * when OrderForm submitted the order. It's only displayed, never
 * trusted — React escapes it, and nothing here acts on it.
 */
export default function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('orderConfirmation');
  const { ref } = use(searchParams);
  // ?ref=a&ref=b arrives as an array; only a single value is valid.
  const reference = typeof ref === 'string' ? ref : undefined;

  return (
    <Section>
      <Container className="max-w-xl text-center">
        <h1 className="font-display text-3xl text-ink md:text-4xl">
          {t('title')}
        </h1>

        {reference ? (
          <>
            <p className="mt-4 text-ink-muted">{t('body')}</p>
            <div className="mx-auto mt-8 inline-block border border-gold px-6 py-4">
              <p className="text-xs font-medium tracking-wide text-ink-muted">
                {t('referenceLabel')}
              </p>
              <p className="numeric-field mt-1 font-display text-xl text-ink">
                {reference}
              </p>
            </div>
          </>
        ) : (
          <p className="mt-4 text-ink-muted">{t('missingReference')}</p>
        )}

        <div className="mt-10">
          <Link href="/" className={buttonVariants('secondary')}>
            {t('backToHome')}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
