import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Container, Section } from '@/components/ui/Section';
import { buttonVariants } from '@/components/ui/Button';
<<<<<<< HEAD
import { PlaceholderArt } from '@/components/ui/PlaceholderArt';
=======
>>>>>>> cd6dd58 (first upload)

export function Hero() {
  const t = useTranslations('home.hero');

  return (
    <Section className="pt-16 md:pt-24">
      <Container className="grid items-center gap-12 md:grid-cols-2">
        <div className="order-2 md:order-1">
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
        </div>

<<<<<<< HEAD
        <div className="order-1 md:order-2">
          {/* Real product photography goes here once provided — see
              PlaceholderArt component doc comment. */}
          <PlaceholderArt variant="top" className="mx-auto w-full max-w-sm" />
        </div>
=======
        {/* Product photo structure hidden until real photography is available.
        <div className="order-1 md:order-2">
          <PlaceholderArt variant="top" className="mx-auto w-full max-w-sm" />
        </div>
        */}
>>>>>>> cd6dd58 (first upload)
      </Container>
    </Section>
  );
}
