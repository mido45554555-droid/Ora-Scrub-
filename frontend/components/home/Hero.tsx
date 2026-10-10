import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Container, Section } from '@/components/ui/Section';
import { buttonVariants } from '@/components/ui/Button';

export function Hero() {
  const t = useTranslations('home.hero');

  return (
    <Section className="pt-16 md:pt-24">
      <Container>
        <h1 className="max-w-prose font-display text-4xl leading-tight text-ink md:text-5xl">
          {t('headline')}
        </h1>
        <p className="mt-6 max-w-prose text-ink-muted">{t('subheadline')}</p>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Link href="/order" className={buttonVariants('primary')}>
            {t('primaryCta')}
          </Link>
          <Link href="/contact" className={buttonVariants('ghost')}>
            {t('secondaryCta')}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
