'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { buttonVariants } from '@/components/ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Hand-rolled rather than a menu/dialog library — the interaction is
 * simple enough (toggle + Escape-to-close + body scroll lock) that a
 * dependency isn't justified, per "avoid unnecessary dependencies".
 */
export function MobileNav() {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t('closeMenu') : t('menu')}
        className="flex h-10 w-10 flex-col items-center justify-center gap-1.5"
      >
        <span
          className={`block h-px w-6 bg-ink transition-transform duration-base ease-standard ${
            open ? 'translate-y-[3.5px] rotate-45' : ''
          }`}
        />
        <span
          className={`block h-px w-6 bg-ink transition-opacity duration-base ease-standard ${
            open ? 'opacity-0' : ''
          }`}
        />
        <span
          className={`block h-px w-6 bg-ink transition-transform duration-base ease-standard ${
            open ? '-translate-y-[3.5px] -rotate-45' : ''
          }`}
        />
      </button>

      <nav
        id="mobile-menu"
        aria-hidden={!open}
        className={`fixed inset-x-0 top-[65px] z-40 border-b border-border-gold bg-cream-soft transition-[max-height,opacity] duration-base ease-standard ${
          open ? 'max-h-96 opacity-100' : 'pointer-events-none max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="flex flex-col gap-6 px-6 py-8">
          <Link href="/" onClick={() => setOpen(false)} className="text-base text-ink">
            {t('home')}
          </Link>
          <Link
            href="/order"
            onClick={() => setOpen(false)}
            className="text-base text-ink"
          >
            {t('order')}
          </Link>
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="text-base text-ink"
          >
            {t('contact')}
          </Link>
          <div className="flex items-center justify-between border-t border-border pt-6">
            <LanguageSwitcher />
            <Link
              href="/order"
              onClick={() => setOpen(false)}
              className={buttonVariants('primary')}
            >
              {t('cta')}
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
