import { existsSync } from 'node:fs';
import path from 'node:path';
import { BACKEND_ROOT } from '../config.js';

/**
 * Builds the Arabic "new order" email sent to the shop, laid out like
 * an order sheet / invoice. Pure function: takes an order row + its
 * file rows, returns a nodemailer message.
 *
 * Written with tables and inline styles because that is what email
 * clients (Gmail, Outlook) reliably render — flexbox, grid and <style>
 * blocks are not dependable there.
 */

// Gmail rejects messages over 25 MB, and base64 encoding makes
// attachments ~33% larger, so raw attachments are capped well below.
export const MAX_ATTACHMENT_BYTES = 17 * 1024 * 1024;

const LOGO_PATH = path.join(BACKEND_ROOT, 'assets', 'ora-logo.png');
const LOGO_CID = 'ora-logo';

const PAYMENT_METHODS = { vodafone_cash: 'فودافون كاش', instapay: 'إنستاباي' };
const LOCALES = { ar: 'العربية', en: 'English' };
const MATERIAL_LABELS = {
  rosaline: 'بروزالين',
  angelica: 'أنجيليكا',
};

function formatMaterial(material) {
  if (!material) return '—';
  return MATERIAL_LABELS[material] ?? material;
}

// Attached in this order, so the payment screenshot is never the one
// dropped when the size cap is reached.
const FILE_KINDS = [
  { kind: 'payment_screenshot', label: 'صورة إثبات الدفع', slug: 'payment-screenshot' },
  { kind: 'color_reference', label: 'صورة مرجعية للون', slug: 'color-reference' },
  { kind: 'design_reference', label: 'صور مرجعية للتصميم', slug: 'design-reference' },
  { kind: 'reference_photo', label: 'صور مقاسات الخياط', slug: 'tailor-measurements' },
];

const MEASUREMENTS = [
  ['arm_length', 'طول الذراع'],
  ['shoulder_circumference', 'محيط الكتف'],
  ['blouse_length', 'طول البلوزة'],
  ['trouser_length', 'طول البنطلون (من الخصر للقدم)'],
  ['hip_circumference', 'محيط الأرداف'],
  ['waist_circumference', 'محيط الخصر'],
  ['chest_circumference', 'محيط الصدر'],
  ['thigh_circumference', 'محيط الفخذ'],
];

// Brand tokens, matching the site's palette (frontend/app/globals.css).
const C = {
  ink: '#2b2621',
  muted: '#6b625a',
  gold: '#b6925e',
  goldDeep: '#8a693d',
  cream: '#f4ece6',
  creamSoft: '#eee4dd',
  white: '#ffffff',
  line: '#e3d9d0',
};

/** Everything in the email body comes from customers — always escape. */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function multiline(value) {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

function formatCairoTime(date) {
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

/** Picks attachments in priority order without exceeding the size cap. */
function chooseAttachments(files, readFile) {
  const attached = [];
  const skipped = [];
  let total = 0;

  if (existsSync(LOGO_PATH)) {
    attached.push({ filename: 'ora-logo.png', path: LOGO_PATH, cid: LOGO_CID });
  }

  for (const { kind, slug } of FILE_KINDS) {
    const ofKind = files.filter((file) => file.kind === kind);
    ofKind.forEach((file, index) => {
      if (total + file.size_bytes > MAX_ATTACHMENT_BYTES) {
        skipped.push(file);
        return;
      }
      total += file.size_bytes;
      const extension = file.stored_name.split('.').pop();
      const suffix = ofKind.length > 1 ? `-${index + 1}` : '';
      attached.push({
        // ASCII names, never the customer's filename.
        filename: `${slug}${suffix}.${extension}`,
        content: readFile(file),
        contentType: file.mime_type,
      });
    });
  }
  return { attached, skipped };
}

// --- HTML building blocks ---------------------------------------------------

const sectionTitle = (title) =>
  `<tr><td style="padding:22px 24px 8px;font-family:Tahoma,Arial,sans-serif;font-size:13px;font-weight:bold;color:${C.goldDeep};letter-spacing:.5px">${escapeHtml(title)}</td></tr>`;

/** Label/value rows inside a bordered table. */
function detailTable(rows) {
  const body = rows
    .map(
      ([label, value], index) =>
        `<tr style="background:${index % 2 ? C.white : '#faf7f4'}">
           <td width="38%" style="padding:9px 14px;border:1px solid ${C.line};font-family:Tahoma,Arial,sans-serif;font-size:13px;color:${C.muted};vertical-align:top">${escapeHtml(label)}</td>
           <td style="padding:9px 14px;border:1px solid ${C.line};font-family:Tahoma,Arial,sans-serif;font-size:14px;color:${C.ink};font-weight:bold">${multiline(value)}</td>
         </tr>`
    )
    .join('');
  return `<tr><td style="padding:0 24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${body}</table>
    </td></tr>`;
}

/** Measurements as a two-per-row grid, like a spec sheet. */
function measurementTable(order) {
  const cells = MEASUREMENTS.map(
    ([column, label]) =>
      `<td width="50%" style="padding:9px 14px;border:1px solid ${C.line};font-family:Tahoma,Arial,sans-serif;font-size:13px;color:${C.muted}">
         ${escapeHtml(label)}
         <span style="display:inline-block;margin-inline-start:6px;font-size:15px;font-weight:bold;color:${C.ink}">${escapeHtml(order[column])}</span>
         <span style="font-size:11px;color:${C.muted}"> سم</span>
       </td>`
  );

  const rows = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(`<tr style="background:${(i / 2) % 2 ? C.white : '#faf7f4'}">${cells[i]}${cells[i + 1] ?? ''}</tr>`);
  }
  return `<tr><td style="padding:0 24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows.join('')}</table>
    </td></tr>`;
}

/**
 * @param {object} order   row from `orders`
 * @param {object[]} files rows from `order_files`
 * @param {(file: object) => import('node:stream').Readable | string} readFile
 *   returns the file's content (a path or stream) for nodemailer
 */
export function buildOrderEmail(order, files, readFile) {
  const { attached, skipped } = chooseAttachments(files, readFile);
  const createdAt = formatCairoTime(new Date(order.created_at));
  const paymentMethod = PAYMENT_METHODS[order.payment_method] ?? order.payment_method;
  const hasLogo = attached.some((file) => file.cid === LOGO_CID);

  const customerRows = [
    ['الاسم', order.full_name],
    ['الموبايل', order.mobile_number],
    ['العنوان', order.address],
    ['الطول', `${order.height_cm} سم`],
    ['الوزن', `${order.weight_kg} كجم`],
    ['لغة الموقع', LOCALES[order.locale] ?? order.locale],
  ];
  const customizationRows = [
    ['الشكل / الموديل', order.shape],
    ['نوع القماش', formatMaterial(order.material)],
    ['وصف اللون', order.color_description || '—'],
    ['تفاصيل إضافية', order.additional_details || '—'],
  ];
  const fileSummary = FILE_KINDS.map(({ kind, label }) => [
    label,
    String(files.filter((file) => file.kind === kind).length),
  ]).filter(([, count]) => count !== '0');

  // --- Plain text (for clients that don't render HTML) ------------------
  const text = [
    `ORA — طلب جديد`,
    `رقم الطلب: ${order.reference}`,
    `التاريخ: ${createdAt}`,
    '',
    'بيانات العميل',
    ...customerRows.map(([label, value]) => `- ${label}: ${value}`),
    '',
    'المقاسات (سم)',
    ...MEASUREMENTS.map(([column, label]) => `- ${label}: ${order[column]}`),
    '',
    'التخصيص',
    ...customizationRows.map(([label, value]) => `- ${label}: ${value}`),
    '',
    `طريقة الدفع: ${paymentMethod}`,
    '',
    'الصور المرفقة',
    ...fileSummary.map(([label, count]) => `- ${label}: ${count}`),
    ...(skipped.length
      ? ['', `ملحوظة: ${skipped.length} صورة لم تُرفق لأن حجم الإيميل كبير — موجودة على السيرفر في فولدر الطلب.`]
      : []),
    '',
    'راجع صورة التحويل قبل تأكيد الطلب.',
  ].join('\n');

  // --- HTML -------------------------------------------------------------
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.cream}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">طلب جديد ${escapeHtml(order.reference)} من ${escapeHtml(order.full_name)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" dir="rtl"
             style="width:640px;max-width:100%;background:${C.white};border:1px solid ${C.line};border-top:4px solid ${C.gold}">

        <!-- Letterhead -->
        <tr>
          <td style="padding:24px 24px 18px;border-bottom:1px solid ${C.line}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="right" style="vertical-align:middle">
                  ${hasLogo ? `<img src="cid:${LOGO_CID}" width="64" height="64" alt="ORA" style="display:block;width:64px;height:64px;object-fit:contain">` : ''}
                </td>
                <td align="left" style="vertical-align:middle;font-family:Tahoma,Arial,sans-serif">
                  <div style="font-size:12px;color:${C.muted}">طلب جديد</div>
                  <div style="font-size:20px;font-weight:bold;color:${C.ink};direction:ltr">${escapeHtml(order.reference)}</div>
                  <div style="font-size:12px;color:${C.muted};padding-top:2px">${escapeHtml(createdAt)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Customer name band -->
        <tr>
          <td style="padding:14px 24px;background:${C.creamSoft};font-family:Tahoma,Arial,sans-serif;font-size:15px;color:${C.ink}">
            <strong>${escapeHtml(order.full_name)}</strong>
            <span style="color:${C.muted};font-size:13px"> · </span>
            <span style="direction:ltr;unicode-bidi:isolate;font-size:14px;color:${C.ink}">${escapeHtml(order.mobile_number)}</span>
          </td>
        </tr>

        ${sectionTitle('بيانات العميل')}
        ${detailTable(customerRows)}

        ${sectionTitle('المقاسات')}
        ${measurementTable(order)}

        ${sectionTitle('تخصيص الزي')}
        ${detailTable(customizationRows)}

        ${sectionTitle('الدفع')}
        <tr>
          <td style="padding:0 24px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <tr>
                <td style="padding:14px;border:1px solid ${C.gold};background:#fdfaf6;font-family:Tahoma,Arial,sans-serif">
                  <span style="font-size:13px;color:${C.muted}">طريقة الدفع:</span>
                  <strong style="font-size:15px;color:${C.ink}">${escapeHtml(paymentMethod)}</strong>
                  <div style="font-size:12px;color:${C.goldDeep};padding-top:6px">راجع صورة إثبات الدفع المرفقة قبل تأكيد الطلب.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${sectionTitle('الصور المرفقة')}
        ${detailTable(fileSummary.length ? fileSummary : [['—', 'لا توجد صور']])}
        ${skipped.length
      ? `<tr><td style="padding:10px 24px 0">
                 <div style="padding:10px 14px;background:${C.creamSoft};border-inline-start:3px solid ${C.gold};font-family:Tahoma,Arial,sans-serif;font-size:12px;color:${C.ink}">
                   ${skipped.length} صورة لم تُرفق لأن حجم الإيميل كبير — موجودة على السيرفر في فولدر الطلب.
                 </div></td></tr>`
      : ''
    }

        <tr>
          <td style="padding:22px 24px 26px;font-family:Tahoma,Arial,sans-serif;font-size:11px;color:${C.muted}">
            <div style="border-top:1px solid ${C.line};padding-top:12px">
              الرسالة دي اتبعتت تلقائيًا من موقع ORA عند استلام الطلب.
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Customer text in a header: collapse whitespace so it stays one line.
  const name = String(order.full_name).replace(/\s+/g, ' ').trim().slice(0, 60);

  return {
    subject: `طلب جديد ${order.reference} — ${name}`,
    text,
    html,
    attachments: attached,
  };
}
