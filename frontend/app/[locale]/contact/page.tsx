import { useTranslations } from 'next-intl';
import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Section, Container } from '@/components/ui/Section';

<<<<<<< HEAD
/**
 * Placeholder only. Real contact details (phone, address, socials) are
 * not yet provided and must not be invented.
 */
=======
>>>>>>> cd6dd58 (first upload)
export default function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('contactPage');
<<<<<<< HEAD
  const tPlaceholder = useTranslations('placeholderPage');
=======
>>>>>>> cd6dd58 (first upload)

  return (
    <Section>
      <Container className="text-center">
        <h1 className="font-display text-3xl text-ink">{t('title')}</h1>
<<<<<<< HEAD
        <p className="mt-4 text-ink-muted">{tPlaceholder('comingSoon')}</p>
=======
        <p className="mt-4 text-ink-muted">{t('intro')}</p>
        <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
          <a
            href="https://www.instagram.com/orascrub0/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded border border-border p-5 text-start transition-colors hover:border-gold"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream text-gold-deep">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-medium text-ink">{t('instagram')}</span>
              <span className="mt-1 block text-sm text-ink-muted">@orascrub0</span>
            </span>
          </a>

          <a
            href="https://wa.me/201018221386"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded border border-border p-5 text-start transition-colors hover:border-gold"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream text-gold-deep">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.4 11.7a8.3 8.3 0 0 1-12.3 7.2L4 20l1.2-4a8.3 8.3 0 1 1 15.2-4.3Z" />
                <path d="M9 8.5c.2-.5.5-.5.8-.5h.4c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4-.1.6l-.5.6c-.2.2-.2.4 0 .6.5.9 1.3 1.6 2.2 2.1.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5 0 .4-.2 1.2-.7 1.6-.5.5-1.2.7-2 .6-1.1-.2-2.4-.8-3.7-2-1.1-1-2-2.3-2.2-3.4-.2-.8 0-1.5.4-1.9Z" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-medium text-ink">{t('whatsapp')}</span>
              <span dir="ltr" className="numeric-field mt-1 block text-left text-sm text-ink-muted">
                +20 101 822 1386
              </span>
            </span>
          </a>
        </div>
>>>>>>> cd6dd58 (first upload)
      </Container>
    </Section>
  );
}
