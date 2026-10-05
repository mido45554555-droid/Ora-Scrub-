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

<<<<<<< HEAD
=======
`npm run setup` is also the idempotent schema migration command. It backfills
existing orders with their original created-at processing week and stable queue
positions before enforcing the unique date/position constraint. New orders are
assigned to Saturday-start processing batches of up to 10 orders. Positions
restart at 1 for each batch; existing orders retain their historical dates and
positions. Saturday dates are calculated on the backend in
`PROCESSING_TIME_ZONE` (default `Africa/Cairo`); set the same value in the
backend `.env` on every instance. Assignment is transactionally serialized by
the existing MariaDB/MySQL allocator lock, not by the browser. The batch date
is the scheduled work-start date, not a delivery promise.

The delivery-action feature adds nullable metadata only. On an existing
database, `npm run migrate:delivery` adds `delivered_at`, the hashed one-time
action token/expiry/use timestamps, and its unique hash index without updating
or deleting existing order rows. Set `PUBLIC_SITE_URL` to the public site
origin (for local development, `http://localhost:3000`; production requires
the deployed HTTPS origin) so notification emails link back to the correct
site.

An authenticated admin can complete an order with
`POST /api/admin/orders/:reference/complete`; the endpoint requires the existing
internal API key and admin bearer session. It retains the order and its assigned
batch date/position and records `completed_at`; completed positions are not reused.
`completed` means internal processing is complete; `delivered` means the
customer received the order. Shop emails include a 256-bit random delivery
action link; only its SHA-256 hash is stored, it expires after 30 days, and a
confirmation page requires a deliberate POST before the backend changes the
status and stamps `delivered_at`. Repeated clicks report the already-delivered
state without changing that timestamp. Cancelled orders cannot be delivered.

Batch delivery totals are derived from retained order rows at
`GET /api/admin/orders/batches` (`delivered`, `remaining`, and
`fullyDelivered`); no duplicate counters are stored.

>>>>>>> cd6dd58 (first upload)
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
<<<<<<< HEAD
=======
| GET | `/api/delivery/:token` | key | Minimal order information for the one-time confirmation page |
| POST | `/api/delivery/:token/confirm` | key | Consume the capability and idempotently mark that order delivered |
>>>>>>> cd6dd58 (first upload)
| POST | `/api/admin/login` | key | `{username, password}` → `{token, expiresAt, admin}` |
| POST | `/api/admin/logout` | key + admin | Ends the session |
| GET | `/api/admin/me` | key + admin | Current admin |
| GET | `/api/admin/orders?status=&q=&page=&pageSize=` | key + admin | List/search (reference, name, mobile) |
<<<<<<< HEAD
=======
| GET | `/api/admin/orders/batches` | key + admin | Historical per-batch total/delivered/remaining summary |
>>>>>>> cd6dd58 (first upload)
| GET | `/api/admin/orders/:reference` | key + admin | Full order + file list |
| PATCH | `/api/admin/orders/:reference` | key + admin | `{status?, adminNotes?}` |
| GET | `/api/admin/orders/:reference/files/:fileId` | key + admin | The image itself |

Admin requests send `Authorization: Bearer <token>`.

<<<<<<< HEAD
Order statuses: `pending_review` (new) → `payment_confirmed` →
`in_production` → `shipped` → `delivered`, or `cancelled`.
=======
Order statuses include `pending_review`, `payment_confirmed`, `in_production`,
`shipped`, `completed` (internal work complete), `delivered` (customer received),
and `cancelled`. Direct generic status updates cannot set `delivered`; use the
single-use confirmation action.
>>>>>>> cd6dd58 (first upload)

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
<<<<<<< HEAD
=======
- **Email delivery action:** random 256-bit capability tokens are scoped to
  one order, SHA-256-hashed in the database, expire after 30 days, and can be
  consumed once by an atomic conditional update. GET never changes an order;
  the no-store/no-referrer confirmation page requires an explicit POST and
  shows only the reference, customer name, batch/position, and status.
>>>>>>> cd6dd58 (first upload)
- **Rate limits (per 15 min), three layers:** 5 orders per browser, 30
  per IP, and 100 across everyone as a backstop; plus 10 login attempts
  and 600 admin requests per IP. The per-browser layer exists because
  whole mobile networks share one address here, so a per-IP-only limit
  would block real customers. A browser is identified by the signed,
  httpOnly `ora_device` cookie the backend issues — it carries no
  personal data, is not a login, and a forged one is rejected and
  replaced.
- **Uploads under load:** images stream to temp files inside
  `STORAGE_DIR/.tmp` and are moved into the order folder with a rename,
  so memory doesn't grow with the size or number of uploads, and the
  type check reads only the first 12 bytes. Temp files are removed on
  every path (success, rejection, oversize), each covered by a test.
  `UPLOAD_CONCURRENCY` (default 64) bounds disk I/O; anything over it
  gets `503` + `Retry-After` immediately. Measured: 100 small orders and
  60 simultaneous orders all accepted, 12 simultaneous 30 MB orders all
  accepted, peak RSS ~110 MB.
- **Database under load:** the pool is capped at 10 connections with a
  queue limit, so a flood fails fast instead of piling up forever.
- **Health endpoint:** public, so its database check is cached for 5
  seconds and the route is rate limited — it can't be used to generate
  database load.
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
