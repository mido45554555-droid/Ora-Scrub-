import createMiddleware from 'next-intl/middleware';
import { routing } from './lib/i18n/routing';

// Next.js 16 renamed middleware.ts to proxy.ts. Detects the visitor's
// locale, adds the /en or /ar prefix, and remembers the choice in the
// NEXT_LOCALE cookie (lifetime configured in lib/i18n/routing.ts).
export const proxy = createMiddleware(routing);

export const config = {
  // Run on every path except static files, images, and API routes.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
