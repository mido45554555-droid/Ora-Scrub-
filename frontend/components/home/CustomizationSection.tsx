import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Container, Section } from '@/components/ui/Section';
import { buttonVariants } from '@/components/ui/Button';

export function CustomizationSection() {
  const t = useTranslations('home.customization');

  const points = [
    t('points.shape'),
    t('points.color'),
    t('points.details'),
  ];

  return (
    <Section className="border-t border-border bg-cream">
      <Container className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            {t('heading')}
          </h2>
          <p className="mt-4 max-w-prose text-ink-muted">{t('body')}</p>
        </div>

        <div>
          <ul className="flex flex-col gap-4">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-ink">
                <span aria-hidden className="mt-1 text-gold">
                  ✦
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <Link href="/order" className={`${buttonVariants('primary')} mt-8`}>
            {t('cta')}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
