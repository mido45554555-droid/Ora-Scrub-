# ORA backend

Node.js (Express 5) + MariaDB/MySQL API that receives orders from the
ORA website and lets the shop's admins review them.

```
Browser ──► Next.js  /api/order  (frontend/app/api/order/route.ts)
               │  adds X-Internal-Api-Key + X-Client-IP, streams the upload
               ▼
            this backend on 127.0.0.1:4000 ──► MariaDB (orders, files, admins)
                                           └─► storage/<reference>/<uuid>.<ext>
```

## Getting started (local, XAMPP)

Requires Node 20.12+ and MySQL/MariaDB running (XAMPP control panel → MySQL → Start).

```bash
npm install
npm run setup                    # creates .env with random secrets, the database, a limited DB user, the tables
npm run create-admin -- owner    # prompts for a password (min 12 chars)
npm start                        # or: npm run dev  (restarts on file changes)
```

Then in `../frontend/.env.local`:

```
ORDER_BACKEND_URL=http://127.0.0.1:4000
ORDER_BACKEND_API_KEY=<same value as INTERNAL_API_KEY in backend/.env>
```

and run the site with `npm run dev` in `../frontend`.

### New-order emails

Each new order is emailed to `ORDER_NOTIFY_TO` (orascrubs@gmail.com). The
email is in Arabic, has all the order details, and attaches the images
with the payment screenshot first. Gmail's size limit caps attachments
at about 17 MB; any image left out stays on the server.

To turn it on with Gmail (free, 500 emails/day):

1. Sign in as orascrubs@gmail.com and turn on
   [2-Step Verification](https://myaccount.google.com/signinoptions/two-step-verification).
2. Create an App Password at <https://myaccount.google.com/apppasswords>.
3. Paste it into `SMTP_PASS=` in `.env`, then check it with:

   ```bash
   npm run mail:test     # logs in and sends one test email
   ```

   Restart the backend; it should log `Order emails ON → orascrubs@gmail.com`.

The order is saved **before** any email is attempted, so a mail problem
never loses an order or shows the customer an error. Failed emails are
retried automatically: after 5, 10, 15... minutes, capped at one hour
between tries, for up to 3 days. Each order is emailed exactly once.
To use Brevo instead, see the comments in `.env.example`.

### Tests

```bash
DB_NAME=ora_scrubs_test npm run setup   # once
npm test
```

The suite runs against a real `ora_scrubs_test` database and covers
validation, fake-image uploads, size and count limits, path traversal,
rate limiting, and admin auth.

## API

All `/api/*` routes except `/api/health` require the `X-Internal-Api-Key`
header, which only the Next.js server has. Errors always look like
`{ "error": { "code", "message", "fields"? } }`. `fields` uses the
order form's own keys (`customer.fullName`, `payment.screenshot`, ...).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | `{status:"ok"}` if the DB is reachable |
| POST | `/api/orders` | key | Submit an order (multipart, see below) → `201 {orderReference, status:"success"}` |
| POST | `/api/admin/login` | key | `{username, password}` → `{token, expiresAt, admin}` |
| POST | `/api/admin/logout` | key + admin | Ends the session |
| GET | `/api/admin/me` | key + admin | Current admin |
| GET | `/api/admin/orders?status=&q=&page=&pageSize=` | key + admin | List/search (reference, name, mobile) |
| GET | `/api/admin/orders/:reference` | key + admin | Full order + file list |
| PATCH | `/api/admin/orders/:reference` | key + admin | `{status?, adminNotes?}` |
| GET | `/api/admin/orders/:reference/files/:fileId` | key + admin | The image itself |

Admin requests send `Authorization: Bearer <token>`.

Order statuses: `pending_review` (new) → `payment_confirmed` →
`in_production` → `shipped` → `delivered`, or `cancelled`.

**`POST /api/orders` body** (`multipart/form-data`):

| Field | Content |
|---|---|
| `data` | JSON: `{ locale, customer, measurements, customization, payment: { method } }`, same shape as the form's state, numbers as strings are fine |
| `colorReferenceImage` | exactly 1 image |
| `paymentScreenshot` | exactly 1 image |
| `referencePhotos` | 0–4 images |
| `designReferenceImages` | 0–4 images |

Images: JPG, PNG or WEBP, 5 MB each.

## Security measures

- **Not reachable from outside:** listens on `127.0.0.1` only, and every
  route needs the shared key from the Next.js proxy (compared in constant time).
- **Validation on the server:** every field is checked again with zod (the
  browser check can be bypassed), with the same limits as the form plus
  length caps. Control characters are stripped.
- **Uploads:** the type is detected from the file's bytes (a renamed
  script is rejected), never from its name or the browser's MIME type.
  Files are stored under random UUID names in a folder that is never
  web-served, and are only served back to logged-in admins with
  `nosniff`. Each file is capped at 5 MB, with at most 10 per order, and
  everything is parsed in memory before anything touches disk.
- **Atomic orders:** the order row, file rows and files on disk are
  written together, or not at all.
- **SQL injection:** every query uses parameters; search input escapes
  `%` and `_`.
- **Least-privilege DB user:** the app user can only
  SELECT/INSERT/UPDATE/DELETE in its own database. Root is only used by
  `npm run setup`.
- **Admin auth:** passwords are hashed with scrypt, with a minimum length
  of 12. Session tokens are 256-bit random values, and only their SHA-256
  is stored. Sessions expire after `ADMIN_SESSION_HOURS`. Unknown users
  and wrong passwords take the same time and return the same error.
- **Rate limits (per 15 min):** 5 orders per IP, 100 orders total as a
  backstop, 10 login attempts per IP, and 600 admin requests per IP.
- **Headers and errors:** helmet sets security headers, and responses
  use `Cache-Control: no-store`. Internal errors are logged but never
  shown to callers.
- **Apache/XAMPP:** `.htaccess` (here and at the project root) stops
  Apache from serving `.env` or `storage/`.

## Production checklist

- [ ] Put the site behind a reverse proxy (nginx, Caddy) with HTTPS. The
      proxy must **append** the client address to `X-Forwarded-For` (nginx:
      `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).
      Without one, a client can fake its IP and dodge the per-IP order
      limit; the global limit still applies.
- [ ] Set `NODE_ENV=production`, and use a new `INTERNAL_API_KEY` and
      `DB_PASSWORD` (don't reuse the dev ones).
- [ ] Set `STORAGE_DIR` to a folder outside any web root, and back it up
      together with the database. An order without its payment screenshot
      can't be verified.
- [ ] Keep port 4000 closed in the firewall. Only the Next.js server on
      the same machine should reach it.
- [ ] Run the backend under a process manager (pm2, systemd, a Windows
      service) so it restarts on crash or reboot.
