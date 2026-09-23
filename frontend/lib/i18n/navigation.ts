import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Wraps next/link and next/navigation so paths are automatically
// prefixed/read with the current locale, keeping the language segment
// in sync when the person navigates between pages.
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
