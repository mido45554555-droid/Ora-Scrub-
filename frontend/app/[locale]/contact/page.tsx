import { useTranslations } from 'next-intl';
import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Section, Container } from '@/components/ui/Section';
import { buttonVariants } from '@/components/ui/Button';

const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/orascrub0?utm_source=ig_web_button_share_sheet&rpxt=ZDNlZDc0MzIxNw==';
const WHATSAPP_CONTACT_URL = 'https://wa.me/201066185191';

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M12.04 2a9.86 9.86 0 0 0-8.48 14.9L2.2 22l5.23-1.37A9.94 9.94 0 1 0 12.04 2Zm0 18.16a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.2 8.2 0 1 1 6.95 3.84Zm4.5-6.14c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.57.13-.17.25-.65.81-.8.98-.14.17-.29.19-.54.06-.25-.13-1.04-.38-1.98-1.2-.73-.65-1.22-1.45-1.37-1.7-.14-.25-.01-.39.11-.51.11-.11.25-.29.38-.43.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.42 1.03 2.59c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.52.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.59.21-1.09.15-1.19-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

/**
 * Placeholder only. Real contact details (phone, address, socials) are
 * not yet provided and must not be invented.
 */
export default function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('contactPage');
  const tPlaceholder = useTranslations('placeholderPage');

  return (
    <Section>
      <Container className="text-center">
        <h1 className="font-display text-3xl text-ink">{t('title')}</h1>
        <p className="mt-4 text-ink-muted">{t('intro')}</p>
        <p className="mt-4 text-ink-muted">{tPlaceholder('comingSoon')}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('instagram')}
              className={buttonVariants('secondary') + ' w-full gap-3 sm:w-auto'}
            >
              <InstagramIcon />
              <span>{t('instagram')}</span>
            </a>
            <p className="text-xs text-ink-muted">{t('instagramPlaceholder')}</p>
          </div>
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
            <a
              href={WHATSAPP_CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('whatsapp')}
              className={buttonVariants('secondary') + ' w-full gap-3 sm:w-auto'}
            >
              <WhatsAppIcon />
              <span>{t('whatsapp')}</span>
            </a>
            <p className="text-xs text-ink-muted">{t('whatsappPlaceholder')}</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
