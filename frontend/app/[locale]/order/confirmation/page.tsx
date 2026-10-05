<<<<<<< HEAD
import { useTranslations } from 'next-intl';
import { use } from 'react';
import { setRequestLocale } from 'next-intl/server';
=======
import { getTranslations, setRequestLocale } from 'next-intl/server';
>>>>>>> cd6dd58 (first upload)
import { Section, Container } from '@/components/ui/Section';
import { Link } from '@/lib/i18n/navigation';
import { buttonVariants } from '@/components/ui/Button';

<<<<<<< HEAD
=======
type QueueSummary = {
  orderReference: string;
  status: string;
  batchDate: string;
  workStartDate: string;
  batchPosition: number;
  queuePosition: number;
  createdAt: string;
  batchCapacity: number;
};

async function loadQueueSummary(reference: string): Promise<QueueSummary | null> {
  const backendUrl = process.env.ORDER_BACKEND_URL;
  const apiKey = process.env.ORDER_BACKEND_API_KEY;
  if (!backendUrl || !apiKey || !/^ORA-\d{6}-[0-9A-Z]{6}$/.test(reference)) return null;

  try {
    const response = await fetch(
      new URL(`/api/orders/${encodeURIComponent(reference)}/queue`, backendUrl),
      {
        headers: { 'x-internal-api-key': apiKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('orderReference' in body) ||
      !('batchDate' in body) ||
      !('workStartDate' in body) ||
      !('batchPosition' in body) ||
      !('queuePosition' in body) ||
      !('createdAt' in body) ||
      !('batchCapacity' in body) ||
      typeof body.orderReference !== 'string' ||
      typeof body.batchDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.batchDate) ||
      typeof body.workStartDate !== 'string' ||
      typeof body.batchPosition !== 'number' ||
      typeof body.queuePosition !== 'number' ||
      typeof body.createdAt !== 'string' ||
      Number.isNaN(Date.parse(body.createdAt)) ||
      typeof body.batchCapacity !== 'number'
    ) return null;
    return body as QueueSummary;
  } catch {
    return null;
  }
}

>>>>>>> cd6dd58 (first upload)
/**
 * Reads ?ref= from the URL: the order reference the backend returned
 * when OrderForm submitted the order. It's only displayed, never
 * trusted — React escapes it, and nothing here acts on it.
 */
<<<<<<< HEAD
export default function OrderConfirmationPage({
=======
export default async function OrderConfirmationPage({
>>>>>>> cd6dd58 (first upload)
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
<<<<<<< HEAD
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('orderConfirmation');
  const { ref } = use(searchParams);
  // ?ref=a&ref=b arrives as an array; only a single value is valid.
  const reference = typeof ref === 'string' ? ref : undefined;
=======
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('orderConfirmation');
  const { ref } = await searchParams;
  // ?ref=a&ref=b arrives as an array; only a single value is valid.
  const reference = typeof ref === 'string' ? ref : undefined;
  const queue = reference ? await loadQueueSummary(reference) : null;
  const formattedCreatedAt = queue
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : locale, {
      timeZone: 'Africa/Cairo',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(queue.createdAt))
    : '';
  const formatBatchDate = (date: string, style: 'full' | 'long') => new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    dateStyle: style,
  }).format(new Date(`${date}T00:00:00.000Z`));
  const formattedWorkStart = queue ? formatBatchDate(queue.workStartDate, 'full') : '';
  const formattedBatchDate = queue ? formatBatchDate(queue.batchDate, 'long') : '';
>>>>>>> cd6dd58 (first upload)

  return (
    <Section>
      <Container className="max-w-xl text-center">
        <h1 className="font-display text-3xl text-ink md:text-4xl">
          {t('title')}
        </h1>

        {reference ? (
          <>
            <p className="mt-4 text-ink-muted">{t('body')}</p>
            <div className="mx-auto mt-8 inline-block border border-gold px-6 py-4">
              <p className="text-xs font-medium tracking-wide text-ink-muted">
                {t('referenceLabel')}
              </p>
              <p className="numeric-field mt-1 font-display text-xl text-ink">
                {reference}
              </p>
            </div>
<<<<<<< HEAD
=======
            {queue ? (
              <div className="mx-auto mt-6 max-w-md border border-border bg-field px-6 py-5 text-start">
                <p className="font-medium text-ink">
                  {t('queuePosition', { position: queue.batchPosition, capacity: queue.batchCapacity })}
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  {t('orderReceivedAt', { date: formattedCreatedAt })}
                </p>
                <p className="mt-2 text-sm font-medium text-ink">
                  {t('workStarts', { date: formattedWorkStart })}
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  {t('batchDate', { date: formattedBatchDate })}
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  {t('batchCapacity', { capacity: queue.batchCapacity })}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm text-ink-muted">{t('queueUnavailable')}</p>
            )}
>>>>>>> cd6dd58 (first upload)
          </>
        ) : (
          <p className="mt-4 text-ink-muted">{t('missingReference')}</p>
        )}

        <div className="mt-10">
          <Link href="/" className={buttonVariants('secondary')}>
            {t('backToHome')}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
