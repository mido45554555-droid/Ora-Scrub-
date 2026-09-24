import { type NextRequest, NextResponse } from 'next/server';

/**
 * Same-origin proxy from the browser to the Node.js order backend
 * (../backend). The browser never learns the backend's address or the
 * shared API key; this route adds the key server-side and streams the
 * multipart upload straight through without buffering it in memory.
 */

// 10 images x 5 MB, plus the JSON field and multipart overhead.
/** Signed, httpOnly cookie holding this browser's device token. */
const DEVICE_COOKIE = 'ora_device';

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

  // Identifies this browser to the backend so order limits are counted
  // per device, not only per address (mobile networks share addresses,
  // so one customer could otherwise use up a whole neighbourhood's
  // allowance). The value is signed by the backend and meaningless to
  // the browser; it is not an account or a login.
  const deviceToken = request.cookies.get(DEVICE_COOKIE)?.value;
  if (deviceToken) headers['x-device-token'] = deviceToken;

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

    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    });

    // The backend issues a fresh token when the browser had none (or a
    // tampered one). httpOnly so page scripts can't read or forge it.
    const issuedToken = upstream.headers.get('x-device-token');
    if (issuedToken) {
      response.cookies.set(DEVICE_COOKIE, issuedToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error('Order backend request failed:', error);
    return errorResponse(502, 'UNAVAILABLE', 'Order submission is temporarily unavailable.');
  }
}
