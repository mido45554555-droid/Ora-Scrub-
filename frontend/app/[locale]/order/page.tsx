import { useTranslations } from 'next-intl';
import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Section, Container } from '@/components/ui/Section';
import { OrderForm } from '@/components/order/OrderForm';

export default function OrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('orderForm.intro');

  return (
    <Section className="py-16 md:py-20">
      <Container className="max-w-3xl">
        <h1 className="font-display text-3xl text-ink md:text-4xl">
          {t('heading')}
        </h1>
        <p className="mt-3 max-w-prose text-ink-muted">{t('body')}</p>

        <div className="mt-12">
          <OrderForm />
        </div>
      </Container>
    </Section>
  );
}
