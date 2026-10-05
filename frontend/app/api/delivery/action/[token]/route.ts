import { NextRequest, NextResponse } from 'next/server';
import { signDeliveryFlash } from '@/lib/order/deliveryFlash';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ token: string }> }
) {
    const origin = request.headers.get('origin');
    const fetchSite = request.headers.get('sec-fetch-site');
    if ((origin && origin !== request.nextUrl.origin) || fetchSite === 'cross-site') {
        return NextResponse.redirect(new URL('/en/delivery/action/invalid', request.url), 303);
    }

    const { token } = await context.params;
    const localeParam = request.nextUrl.searchParams.get('locale');
    const locale = localeParam === 'ar' ? 'ar' : 'en';
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
        return NextResponse.redirect(new URL(`/${locale}/delivery/action/invalid`, request.url), 303);
    }

    const backendUrl = process.env.ORDER_BACKEND_URL;
    const apiKey = process.env.ORDER_BACKEND_API_KEY;
    let result = 'unavailable';
    let signedResult: 'success' | 'already' | null = null;
    if (backendUrl && apiKey) {
        try {
            const response = await fetch(
                new URL(`/api/delivery/${token}/confirm`, backendUrl),
                {
                    method: 'POST',
                    headers: { 'x-internal-api-key': apiKey },
                    cache: 'no-store',
                    signal: AbortSignal.timeout(10_000),
                }
            );
            if (response.ok) {
                const body: unknown = await response.json();
                if (body && typeof body === 'object' && 'status' in body) {
                    if (body.status === 'delivered') {
                        result = 'success';
                        signedResult = 'success';
                    } else if (body.status === 'already_delivered') {
                        result = 'already';
                        signedResult = 'already';
                    } else {
                        result = 'invalid';
                    }
                }
            } else if (response.status === 404) {
                result = 'invalid';
            } else if (response.status === 409) {
                result = 'cancelled';
            }
        } catch {
            result = 'unavailable';
        }
    }

    const expires = String(Date.now() + 5 * 60 * 1000);
    const signature = signedResult && apiKey
        ? signDeliveryFlash(apiKey, token, signedResult, expires)
        : null;
    const resultParams = new URLSearchParams({ result });
    if (signature) {
        resultParams.set('expires', expires);
        resultParams.set('sig', signature);
    }
    return NextResponse.redirect(
        new URL(`/${locale}/delivery/action/${token}?${resultParams.toString()}`, request.url),
        303
    );
}
