import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Container, Section } from '@/components/ui/Section';
import { Divider } from '@/components/ui/Divider';
import { buttonVariants } from '@/components/ui/Button';

export function FinalCta() {
  const t = useTranslations('home.finalCta');

  return (
    <Section className="border-t border-border bg-ink text-cream-soft">
      <Container className="flex flex-col items-center text-center">
        <h2 className="max-w-2xl font-display text-3xl md:text-4xl">
          {t('heading')}
        </h2>
        <Divider ornamented className="my-8 w-48" />
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/order" className={buttonVariants('primaryOnDark')}>
            {t('primaryCta')}
          </Link>
          <Link
            href="/contact"
            className="text-sm text-cream-soft/80 hover:text-gold-light"
          >
            {t('secondaryCta')}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
