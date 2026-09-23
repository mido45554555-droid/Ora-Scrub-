import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Container } from '@/components/ui/Section';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const tBrand = useTranslations('brand');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-gold">
      <Container className="grid gap-10 py-14 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg text-ink">{tBrand('name')}</p>
          <p className="mt-1 text-sm text-gold-deep">{tBrand('tagline')}</p>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-ink-muted">
            {t('navHeading')}
          </p>
          <nav className="mt-4 flex flex-col gap-3">
            <Link href="/" className="text-sm text-ink hover:text-gold-deep">
              {tNav('home')}
            </Link>
            <Link
              href="/order"
              className="text-sm text-ink hover:text-gold-deep"
            >
              {tNav('order')}
            </Link>
            <Link
              href="/contact"
              className="text-sm text-ink hover:text-gold-deep"
            >
              {tNav('contact')}
            </Link>
          </nav>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-ink-muted">
            {t('contactHeading')}
          </p>
          {/* Real phone/address/social data intentionally omitted until
              provided — do not invent it. */}
          <p className="mt-4 text-sm text-ink-muted">
            {t('contactPlaceholder')}
          </p>
          <div className="mt-6">
            <LanguageSwitcher />
          </div>
        </div>
      </Container>

      <Container className="border-t border-border py-6 text-xs text-ink-faint">
        <p>
          {tBrand('name')} · {year} {t('rights')}
        </p>
      </Container>
    </footer>
  );
}
