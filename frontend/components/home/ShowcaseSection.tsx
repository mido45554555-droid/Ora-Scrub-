import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/ui/Section';
import { Divider } from '@/components/ui/Divider';
import { PlaceholderArt } from '@/components/ui/PlaceholderArt';

/**
 * Editorial layout: three unequal-width panels rather than a uniform
 * product-card grid, so it reads as brand presentation rather than an
 * e-commerce listing. Swap PlaceholderArt for next/image once real
 * photography is provided — the grid/aspect handling won't need to change.
 */
export function ShowcaseSection() {
  const t = useTranslations('home.showcase');

  return (
    <Section className="border-t border-border">
      <Container>
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl text-ink md:text-4xl">
            {t('heading')}
          </h2>
          <p className="mt-4 text-ink-muted">{t('body')}</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <PlaceholderArt variant="top" className="w-full" />
          </div>
          <div className="sm:col-span-2">
            <PlaceholderArt variant="set" className="w-full" />
          </div>
        </div>

        <Divider ornamented className="mt-14" />
        <p className="mt-8 max-w-prose text-sm text-ink-muted">{t('note')}</p>
      </Container>
    </Section>
  );
}
