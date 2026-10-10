import { buttonVariants } from '@/components/ui/Button';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { INSTAGRAM_PROFILE_URL, WHATSAPP_CONTACT_URL } from '@/lib/contactLinks';

interface PaymentWarningProps {
  onDismiss: () => void;
}

export function PaymentWarning({ onDismiss }: PaymentWarningProps) {
  return (
    <aside
      dir="rtl"
      role="status"
      aria-live="polite"
      className="rounded border border-gold bg-cream px-4 py-4 text-right text-sm text-ink"
    >
      <p className="font-medium">
        تنبيه مهم: بعد إتمام الدفع، يجب عليك أخذ Screenshot لإثبات الدفع وإرسالها إلى أورا عبر واتساب أو إنستجرام حتى يتم تأكيد طلبك.
      </p>
      <p className="mt-2 text-ink-muted">
        ارفع صورة إثبات الدفع أدناه، ثم أرسلها مع رقم الطلب بعد إرساله.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={WHATSAPP_CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants('secondary') + ' gap-2'}
        >
          <SocialIcon name="whatsapp" />
          واتساب
        </a>
        <a
          href={INSTAGRAM_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants('secondary') + ' gap-2'}
        >
          <SocialIcon name="instagram" />
          إنستجرام
        </a>
        <button
          type="button"
          onClick={onDismiss}
          className={buttonVariants('ghost') + ' sm:ms-auto'}
        >
          تم
        </button>
      </div>
    </aside>
  );
}
