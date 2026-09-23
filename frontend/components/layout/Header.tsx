import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/lib/i18n/navigation';
import { Container } from '@/components/ui/Section';
import { buttonVariants } from '@/components/ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNav } from './MobileNav';

export function Header() {
  const t = useTranslations('nav');
  const tBrand = useTranslations('brand');

  return (
    <header className="sticky top-0 z-50 border-b border-border-gold bg-cream-soft/95 backdrop-blur-sm">
      <Container className="flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/assets/logo/ora-logo.png"
            alt={tBrand('name')}
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            priority
          />
          <span className="font-display text-lg tracking-wide text-ink">
            {tBrand('name')}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-sm text-ink hover:text-gold-deep">
            {t('home')}
          </Link>
          <Link
            href="/order"
            className="text-sm text-ink hover:text-gold-deep"
          >
            {t('order')}
          </Link>
          <Link
            href="/contact"
            className="text-sm text-ink hover:text-gold-deep"
          >
            {t('contact')}
          </Link>
          <LanguageSwitcher />
          <Link href="/order" className={buttonVariants('primary')}>
            {t('cta')}
          </Link>
        </nav>

        <MobileNav />
      </Container>
    </header>
  );
}
