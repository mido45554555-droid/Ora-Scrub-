import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/ui/Section';

export function ValueSection() {
  const t = useTranslations('home.value');

  return (
    <Section className="border-t border-border">
      <Container className="max-w-3xl text-center">
        <h2 className="font-display text-3xl text-ink md:text-4xl">
          {t('heading')}
        </h2>
        <p className="mt-6 text-ink-muted">{t('body')}</p>
      </Container>
    </Section>
  );
}
