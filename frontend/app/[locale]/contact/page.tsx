import { useTranslations } from 'next-intl';
import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Section, Container } from '@/components/ui/Section';

/**
 * Placeholder only. Real contact details (phone, address, socials) are
 * not yet provided and must not be invented.
 */
export default function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('contactPage');
  const tPlaceholder = useTranslations('placeholderPage');

  return (
    <Section>
      <Container className="text-center">
        <h1 className="font-display text-3xl text-ink">{t('title')}</h1>
        <p className="mt-4 text-ink-muted">{tPlaceholder('comingSoon')}</p>
      </Container>
    </Section>
  );
}
