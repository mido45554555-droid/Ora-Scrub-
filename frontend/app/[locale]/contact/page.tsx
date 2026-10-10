import { useTranslations } from 'next-intl';
import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Section, Container } from '@/components/ui/Section';
import { buttonVariants } from '@/components/ui/Button';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { INSTAGRAM_PROFILE_URL, WHATSAPP_CONTACT_URL } from '@/lib/contactLinks';

const INSTAGRAM_DISPLAY_NAME = 'Ora Scrub';
const WHATSAPP_DISPLAY_NUMBER = '+20 106 618 5191';

export default function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('contactPage');

  return (
    <Section>
      <Container className="text-center">
        <h1 className="font-display text-3xl text-ink">{t('title')}</h1>
        <p className="mt-4 text-ink-muted">{t('intro')}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('instagram')}
              className={buttonVariants('secondary') + ' peer w-full gap-3 sm:w-auto'}
            >
              <SocialIcon name="instagram" />
              <span>{t('instagram')}</span>
            </a>
            <p className="text-sm text-ink-muted opacity-0 transition-opacity duration-fast peer-hover:opacity-100 peer-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
              {INSTAGRAM_DISPLAY_NAME}
            </p>
          </div>
          <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
            <a
              href={WHATSAPP_CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('whatsapp')}
              className={buttonVariants('secondary') + ' peer w-full gap-3 sm:w-auto'}
            >
              <SocialIcon name="whatsapp" />
              <span>{t('whatsapp')}</span>
            </a>
            <p dir="ltr" className="text-sm text-ink-muted opacity-0 transition-opacity duration-fast peer-hover:opacity-100 peer-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
              {WHATSAPP_DISPLAY_NUMBER}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
