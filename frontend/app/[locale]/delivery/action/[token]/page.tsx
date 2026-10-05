import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Section, Container } from '@/components/ui/Section';
import { buttonVariants } from '@/components/ui/Button';
import { verifyDeliveryFlash } from '@/lib/order/deliveryFlash';

type DeliverySummary = {
    orderReference: string;
    customerName: string;
    batchDate: string;
    batchPosition: number;
    batchCapacity: number;
    status: string;
    deliveredAt: string | null;
    actionState: 'pending' | 'already_delivered' | 'cancelled';
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
};

async function loadDeliverySummary(token: string): Promise<DeliverySummary | null> {
    const backendUrl = process.env.ORDER_BACKEND_URL;
    const apiKey = process.env.ORDER_BACKEND_API_KEY;
    if (!backendUrl || !apiKey || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

    try {
        const response = await fetch(new URL(`/api/delivery/${token}`, backendUrl), {
            headers: { 'x-internal-api-key': apiKey },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return null;
        const body: unknown = await response.json();
        if (
            !body ||
            typeof body !== 'object' ||
            !('orderReference' in body) ||
            !('customerName' in body) ||
            !('batchDate' in body) ||
            !('batchPosition' in body) ||
            !('batchCapacity' in body) ||
            !('status' in body) ||
            !('actionState' in body) ||
            typeof body.orderReference !== 'string' ||
            typeof body.customerName !== 'string' ||
            typeof body.batchDate !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(body.batchDate) ||
            typeof body.batchPosition !== 'number' ||
            typeof body.batchCapacity !== 'number' ||
            typeof body.status !== 'string' ||
            !['pending', 'already_delivered', 'cancelled'].includes(String(body.actionState))
        ) return null;
        return body as DeliverySummary;
    } catch {
        return null;
    }
}

export default async function DeliveryActionPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string; token: string }>;
    searchParams: Promise<{ result?: string; expires?: string; sig?: string }>;
}) {
    const { locale, token } = await params;
    setRequestLocale(locale);
    const t = await getTranslations('deliveryAction');
    const { result, expires, sig } = await searchParams;
    const signedResult = verifyDeliveryFlash(
        process.env.ORDER_BACKEND_API_KEY,
        token,
        result,
        expires,
        sig
    );
    const summary = await loadDeliverySummary(token);
    const formatBatchDate = (date: string, style: 'full' | 'long') => new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        dateStyle: style,
    }).format(new Date(`${date}T00:00:00.000Z`));
    const statusLabels: Record<string, string> = {
        pending_review: t('statusPendingReview'),
        payment_confirmed: t('statusPaymentConfirmed'),
        in_production: t('statusInProduction'),
        shipped: t('statusShipped'),
        completed: t('statusCompleted'),
        delivered: t('statusDelivered'),
        cancelled: t('statusCancelled'),
    };
    const isAlreadyDelivered = signedResult === 'already' || summary?.actionState === 'already_delivered';

    return (
        <Section>
            <Container className="max-w-xl">
                <div className="rounded border border-border bg-field p-6 sm:p-8">
                    <h1 className="text-center font-display text-3xl text-ink">{t('title')}</h1>

                    {signedResult === 'success' && summary?.actionState === 'already_delivered' ? (
                        <p className="mt-5 rounded border border-gold bg-cream px-4 py-3 text-center font-medium text-ink" role="status">
                            {t('success')}
                        </p>
                    ) : isAlreadyDelivered ? (
                        <p className="mt-5 rounded border border-border px-4 py-3 text-center font-medium text-ink" role="status">
                            {t('alreadyDelivered')}
                        </p>
                    ) : summary?.actionState === 'cancelled' || result === 'cancelled' ? (
                        <p className="mt-5 rounded border border-border px-4 py-3 text-center text-ink-muted" role="alert">
                            {t('cancelled')}
                        </p>
                    ) : !summary ? (
                        <p className="mt-5 rounded border border-border px-4 py-3 text-center text-ink-muted" role="alert">
                            {result === 'unavailable' ? t('unavailable') : t('invalid')}
                        </p>
                    ) : (
                        <>
                            <p className="mt-4 text-center text-ink-muted">{t('reviewPrompt')}</p>
                            <dl className="mt-7 divide-y divide-border border-y border-border">
                                <div className="flex flex-wrap justify-between gap-2 py-3">
                                    <dt className="text-sm text-ink-muted">{t('reference')}</dt>
                                    <dd className="numeric-field text-sm font-semibold text-ink">{summary.orderReference}</dd>
                                </div>
                                <div className="flex flex-wrap justify-between gap-2 py-3">
                                    <dt className="text-sm text-ink-muted">{t('customer')}</dt>
                                    <dd className="text-sm font-medium text-ink">{summary.customerName}</dd>
                                </div>
                                <div className="flex flex-wrap justify-between gap-2 py-3">
                                    <dt className="text-sm text-ink-muted">{t('batchPosition')}</dt>
                                    <dd className="numeric-field text-sm font-semibold text-ink">#{summary.batchPosition} / {summary.batchCapacity}</dd>
                                </div>
                                <div className="flex flex-wrap justify-between gap-2 py-3">
                                    <dt className="text-sm text-ink-muted">{t('batchDate')}</dt>
                                    <dd className="text-sm font-medium text-ink">{formatBatchDate(summary.batchDate, 'long')}</dd>
                                </div>
                                <div className="flex flex-wrap justify-between gap-2 py-3">
                                    <dt className="text-sm text-ink-muted">{t('currentStatus')}</dt>
                                    <dd className="text-sm font-medium text-ink">{statusLabels[summary.status] ?? summary.status}</dd>
                                </div>
                            </dl>
                            <p className="mt-5 text-center text-sm text-ink-muted">
                                {t('workStarts', { date: formatBatchDate(summary.batchDate, 'full') })}
                            </p>
                            <form action={`/api/delivery/action/${token}?locale=${locale}`} method="post" className="mt-7 text-center">
                                <button type="submit" className={buttonVariants('primary')}>
                                    {t('confirm')}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </Container>
        </Section>
    );
}
