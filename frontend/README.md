# ORA — Medical Scrubber

Bilingual (Arabic/English) premium website for custom medical scrubs.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · next-intl 4

## Getting started

This project was built without network access in the build sandbox, so
dependencies are declared in `package.json` but not installed. On your
machine:

```bash
npm install
cp .env.example .env.local   # then set ORDER_BACKEND_API_KEY
npm run dev
```

Orders are sent to the Node.js backend in `../backend`. Start it first
(see `../backend/README.md`); without it, submitting an order shows a
"something went wrong" message instead of a confirmation.

Then visit `http://localhost:3000` — it will redirect to `/en` or `/ar`
depending on your browser's language.

**Verification note:** the Google Fonts exports in `lib/fonts.ts`
(`Cormorant`, `Amiri`, `IBM_Plex_Sans`, `IBM_Plex_Sans_Arabic`) were
written against documented `next/font/google` naming conventions but
could not be build-tested in this sandbox. Run `npm run dev` and check
for font-loading errors as your first step — if an export name is
slightly off, `next/font/google`'s error message names the correct
export directly.

## Project structure

```
app/
  [locale]/
    layout.tsx              # root layout: <html dir/lang>, fonts, header/footer, localized metadata
    page.tsx                # home (placeholder using design-system primitives)
    order/page.tsx           # order form (placeholder)
    order/confirmation/page.tsx
    contact/page.tsx         # (placeholder)
  api/
    order/route.ts           # proxy to the Node.js order backend (../backend)
  globals.css                 # design tokens (CSS custom properties)
components/
  layout/                     # Header, Footer, LanguageSwitcher
  ui/                          # Button, TextField, Divider, Section/Container
lib/
  i18n/                        # locale config, next-intl request config, navigation helpers
  fonts.ts                     # next/font setup, EN/AR pairing
  constants.ts                 # config-driven option lists (materials, shapes, payment methods)
  cn.ts                         # small classname utility
messages/
  en.json / ar.json             # translation strings (kept in sync key-for-key)
public/assets/
  logo/                         # official ORA logo
  products/                     # real product photography goes here later
types/
  order.ts                      # shared order data shapes
proxy.ts                        # locale detection + URL prefixing (Next 16 name for middleware.ts)
tailwind.config.ts               # theme wired to CSS variable tokens
```

## Design tokens (Phase 2)

All defined in `app/globals.css`. See the comment block at the top of
that file for full provenance notes. Summary:

**Color**
- Gold (`--color-gold-light` / `--color-gold` / `--color-gold-deep` / `--color-gold-shadow`) — pixel-sampled directly from the official logo via k-means clustering, confirmed with an exhaustive full-image scan.
- Cream (`--color-cream` / `--color-cream-soft` / `--color-cream-white`) — the logo's own background tone, with one extra neutral lift for card/surface use.
- **No navy** — confirmed absent from the logo by exhaustive pixel scan (twice). Palette is gold + cream only per client decision. A navy-inclusive asset can be incorporated later if provided.
- Ink (`--color-ink` and muted/faint variants) — **not a brand color**, a functional near-black neutral needed for text contrast against the cream background. Flagged for approval, not a silent assumption.
- Border tokens (`--color-border`, `--color-border-gold`) — hairline dividers, not heavy card borders.

**Typography**
- Display: Cormorant (EN) / Amiri (AR) — both refined serifs with the same "editorial, bookish" register, echoing the logo's own thin-stroke serif wordmark.
- Body: IBM Plex Sans (EN) / IBM Plex Sans Arabic (AR) — designed as siblings in the same type family for maximum EN/AR coherence.
- Switches automatically via `[dir="rtl"]` in `globals.css` — no duplicated layout or component logic.

**Spacing / radius / shadow / motion**
- Spacing scale: `--space-3xs` through `--space-3xl`, generous editorial rhythm rather than dense SaaS spacing.
- Radius: near-square (`--radius-sm: 2px`, `--radius-md: 3px`) — deliberately restrained.
- Shadow: near-imperceptible (`--shadow-sm`, `--shadow-md`); hairline borders preferred over shadow for elevation.
- Motion: short, purposeful durations (`--duration-fast`, `--duration-base`); `prefers-reduced-motion` respected globally.

## Reusable primitives

- `Button` (`components/ui/Button.tsx`) — primary/secondary/ghost variants, near-square radius, sentence-case labels.
- `TextField` (`components/ui/TextField.tsx`) — hairline underline style (not boxed), numeric-field LTR isolation for measurements.
- `Divider` (`components/ui/Divider.tsx`) — plain hairline or ornamented (small centered mark echoing the logo's star accents), for use between major sections only.
- `Section` / `Container` (`components/ui/Section.tsx`) — consistent spacing rhythm and max-width wrapper, logical properties so it behaves identically in RTL/LTR.

## Phase 3 — Homepage

Full homepage built at `/[locale]` from `components/home/*`: Hero, ValueSection,
ShowcaseSection, CustomizationSection, ProcessSection, FinalCta. Header now
includes a responsive desktop nav + CTA and a hand-rolled accessible mobile
menu (`components/layout/MobileNav.tsx`). Footer expanded with nav links and
a contact placeholder.

**No real product photography exists in the project yet.** The hero and
showcase sections use `components/ui/PlaceholderArt.tsx` — an original,
independently-drawn abstract linework motif (not derived from or modifying
the logo file). Swap it for `next/image` calls once real photography is
provided; the surrounding layout/grid code doesn't need to change.

Official brand name is now confirmed: **ORA** (English) / **أورا** (Arabic).
The tagline ("Medical Scrubber" / "الزي الطبي") has been translated as
reasonable descriptive copy, not treated as fixed brand identity — flag if
you'd prefer the Latin tagline preserved on Arabic pages instead.

## Phase 4 — Order Form

Full order form UI at `/[locale]/order`, built from `components/order/*`:
`OrderForm` (state + validation orchestrator, no backend call yet),
`CustomerInfoSection`, `MeasurementsSection`, `ScrubCustomizationSection`,
`PaymentSection`, plus reusable `FormSection` (numbered section wrapper)
and `FileUploadField` (accessible upload with previews/removal, immediate
client-side type/size rejection).

Validation lives in `lib/validation/order.ts` (Zod schema) and
`lib/validation/fileConstraints.ts` (shared file type/size limits used by
both the schema and the upload UI, so they can't drift out of sync).
Raw controlled-input form state types live in `lib/order/formState.ts`,
kept separate from the Zod-validated/coerced types so numeric inputs can
stay as plain strings until submit.

**No backend call exists yet.** Submit runs the full Zod schema
client-side; on success it shows an inline notice ("backend submission
will be connected in a later phase") rather than sending anything
anywhere. The validated, typed result (`ValidatedOrder`) is exactly the
shape the future Apps Script integration will consume.

## Payment method UI (focused update)

Payment method selection was upgraded from plain radio buttons to
selectable cards (`components/order/PaymentMethodCard.tsx`): each shows
a logo, provider name, and account holder name, with the account
details revealed inline only for the selected card. Built as an
accessible "radio card" pattern — a real native radio input (visually
hidden, not `display:none`) paired with a label rendering the full
card, so keyboard/screen-reader behavior is unchanged from a plain
radio group.

Account configuration lives in `lib/constants.ts`:
`VODAFONE_CASH_NUMBER` and `INSTAPAY_ACCOUNT` are placeholder constants
— replace just these two values when you have the real details, nothing
in the UI needs to change. Account holder names ("دعاء" / "عبدالله")
and both providers' logo paths are also defined there, in
`PAYMENT_ACCOUNTS`.

**No logo assets exist yet** — see `public/assets/payments/README.md`
for expected filenames. The card falls back to a plain text badge
(never a fake/unrelated icon) until real logos are added.

`components/ui/RadioGroup.tsx` was removed — it was built solely for
the old payment method UI and is now fully superseded, so it was
deleted rather than left as dead code.

## Order basket / review-and-edit (Phase 5)

A small "review order" button (bottom-corner, brand-styled, not a
shopping-cart icon) opens a drawer summarizing everything entered so
far: customer info, measurements, customization, and payment —
grouped exactly like the form's own sections. Text fields show an
"Edit" link that closes the drawer and scrolls to that section in the
form; all image uploads (tailor photos, color reference, design
references, payment screenshot) and the payment method selector are
fully interactive right inside the drawer, reusing the exact same
state and update functions `OrderForm` already passes to its section
components — nothing is duplicated, persisted separately, or sent
anywhere. No login; the basket only reflects the current in-memory
form session, per the client's explicit "no accounts" requirement.

New: `components/order/OrderBasket.tsx`. `FormSection` gained an
optional `id` prop so the basket can scroll directly to a section.

**Scoping note:** the review button lives on the order page itself
(next to the form), not in the global site header — there's no
cross-page order state (by design, since none was requested), so a
header-level icon would be misleading on pages with no order in
progress. If persistent cross-page access is wanted later, that's a
separate, larger change (state lifting or localStorage) worth
discussing before building.

## Manual changes preserved from the client's edited project

This phase started from the client's own edited copy of the project,
not the last AI-generated version, per their explicit instruction.
Preserved as-is, untouched by this phase's changes:

- The logo file (`public/assets/logo/ora-logo.png`) — client's updated mark
- `messages/ar.json`: `brand.name` kept as `"ORA"` (not reverted to the earlier transliteration)
- `messages/ar.json`: the shortened measurements section description and the reworded tailor-photo hint, kept exactly as edited
- `components/order/PaymentMethodCard.tsx`: an explicit return-type annotation added by the client's editor/tooling, left in place

## Phase 6 — Final QA, polish, and production-readiness

Real checks were run this time (the provided project included a working
`node_modules`), not just static review:

- `npm run lint` → **clean, zero warnings** (fixed one real `no-img-element` warning by switching the payment logo to `next/image`)
- `npx tsc --noEmit` (full project, real strict-mode config) → **clean, zero errors** (fixed one real bug: a focus-trap helper indexed an array without narrowing under `noUncheckedIndexedAccess`)
- `npm run build` → **could not complete in this sandbox**: the provided `node_modules` contains Windows-only native SWC binaries, this sandbox is Linux, and there's no network access here to fetch the Linux binary. This is an environment mismatch, not a code defect — run the build on the machine that already runs `npm run dev` successfully.

Real bugs found and fixed:
- The order basket's summary grid used a fixed 2-column layout inside a drawer whose width never depends on the outer viewport's `sm:`/`md:` breakpoints the way page content does — long labels like "Shoulder circumference (cm)" would wrap awkwardly. Fixed to single-column on narrow screens.
- The basket's `role="dialog" aria-modal="true"` didn't actually trap keyboard focus — added a real focus trap.
- The submit button and the new basket trigger both read "Review order" — renamed the submit button to "Submit order" to disambiguate.
- Submitting the form only showed an inline message and never reached the confirmation page or displayed an order reference, despite both already being part of the architecture. Wired this up with a client-side placeholder reference (`lib/order/reference.ts` — explicitly documented as needing replacement by a server-generated reference once Apps Script exists) and real navigation to `/order/confirmation?ref=...`.
- Added disabled-state duplicate-submission prevention on the submit button.
- The basket's floating trigger button could plausibly touch the submit button's width at 320px viewports when both are in view at the same scroll position — made it icon-only below the `sm:` breakpoint.
- Removed two now-orphaned message keys (`successHeading`/`successBody`) left over from before the confirmation-page wiring existed.

**Honest gap, not fixed (out of scope for this phase):** there is no Google
Sheets/Drive/Apps Script integration in this codebase. `app/api/order/route.ts`
is still the original Phase 1 stub (`501 Not Implemented`). No prior phase
actually built this — every phase's brief explicitly deferred it. This phase's
QA cannot "verify" an integration that doesn't exist; building it is future work.

## Security upgrade: Next.js 14 → 16

`npm audit` reported critical advisories in Next.js 14.2.35 (including
unauthenticated remote code execution on Windows-hosted servers) with no
14.x patch, plus issues in next-intl 3, PostCSS and eslint-config-next.
Upgraded to Next 16.3.5, React 19, next-intl 4 and ESLint 9, bringing
`npm audit` to 0 vulnerabilities. Code changes that required:

- `params` / `searchParams` are Promises (unwrapped with `await` in the
  layout and React `use()` in pages, so pages keep using hooks)
- `middleware.ts` → `proxy.ts`; locale routing now lives in
  `lib/i18n/routing.ts`, shared by the proxy and navigation helpers
- the locale cookie is kept for a year (next-intl 4 made it a session
  cookie by default), preserving the "returning visitor keeps their
  language" behavior
- `data-scroll-behavior="smooth"` on `<html>`, so page navigation stays
  instant while in-page links scroll smoothly (Next 16 changed this)
- `next lint` was removed: `npm run lint` now runs `eslint .` with
  `eslint.config.mjs` (flat config, same `core-web-vitals` rules)

## Order backend

The Apps Script plan was replaced by a Node.js + MariaDB backend in
`../backend`. `app/api/order/route.ts` is now a real same-origin proxy
to it (adds the server-side API key, streams the upload). `OrderForm`
sends the order there and shows the reference the server generates.
`lib/order/reference.ts` (the old client-side placeholder reference)
was deleted, as its own comment required. Server-side field errors
appear on the matching form fields.

## What's intentionally not built yet

- Admin dashboard UI (the admin API exists in `../backend`, see its README)
- Material type and scrub shape fixed-option lists (`lib/constants.ts` — empty; the order form's "shape" field is free-text for now, see Phase 4 report)
- Real contact info, pricing, and payment account details
- Real product photography (placeholder art in Phase 3 sections)
