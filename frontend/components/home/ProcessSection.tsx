import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/ui/Section';

export function ProcessSection() {
  const t = useTranslations('home.process');

  const steps = ['one', 'two', 'three', 'four'] as const;

  return (
    <Section className="border-t border-border">
      <Container>
        <h2 className="font-display text-3xl text-ink md:text-4xl">
          {t('heading')}
        </h2>

        <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step}>
              <span className="font-display text-2xl text-gold">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-base font-medium text-ink">
                {t(`steps.${step}.title`)}
              </h3>
              <p className="mt-2 text-sm text-ink-muted">
                {t(`steps.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
