import { type NextRequest, NextResponse } from 'next/server';

/**
 * Same-origin proxy from the browser to the Node.js order backend
 * (../backend). The browser never learns the backend's address or the
 * shared API key; this route adds the key server-side and streams the
 * multipart upload straight through without buffering it in memory.
 */

// 10 images x 5 MB, plus the JSON field and multipart overhead.
const MAX_BODY_BYTES = 52 * 1024 * 1024;
const BACKEND_TIMEOUT_MS = 120_000;

export const dynamic = 'force-dynamic';

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Next.js only sets X-Forwarded-For when the request doesn't already
 * carry one, and a reverse proxy (nginx, a load balancer) appends the
 * address it saw — so the LAST entry is the one a client can't forge.
 */
function clientIp(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',').pop()?.trim() || undefined;
}

export async function POST(request: NextRequest) {
  const backendUrl = process.env.ORDER_BACKEND_URL;
  const apiKey = process.env.ORDER_BACKEND_API_KEY;
  if (!backendUrl || !apiKey) {
    console.error('ORDER_BACKEND_URL / ORDER_BACKEND_API_KEY are not set (see .env.example).');
    return errorResponse(503, 'UNAVAILABLE', 'Order submission is temporarily unavailable.');
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) {
    return errorResponse(415, 'BAD_REQUEST', 'Expected multipart/form-data.');
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'TOO_LARGE', 'The upload is too large.');
  }

  const headers: Record<string, string> = {
    'content-type': contentType,
    'x-internal-api-key': apiKey,
  };
  const ip = clientIp(request);
  if (ip) headers['x-client-ip'] = ip;

  try {
    const upstream = await fetch(new URL('/api/orders', backendUrl), {
      method: 'POST',
      headers,
      body: request.body,
      // Required by Node's fetch to stream a request body.
      duplex: 'half',
      cache: 'no-store',
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    } as RequestInit & { duplex: 'half' });

    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Order backend request failed:', error);
    return errorResponse(502, 'UNAVAILABLE', 'Order submission is temporarily unavailable.');
  }
}
