import { cn } from '@/lib/cn';

interface DividerProps {
  /** Renders a small centered mark echoing the logo's own star accents,
   * for use between major sections rather than as decoration everywhere. */
  ornamented?: boolean;
  className?: string;
}

export function Divider({ ornamented = false, className }: DividerProps) {
  if (!ornamented) {
    return <hr className={cn('border-t border-border', className)} />;
  }

  return (
    <div className={cn('flex items-center gap-4', className)} role="separator">
      <span className="h-px flex-1 bg-border-gold" />
      <span aria-hidden className="text-gold">
        ✦
      </span>
      <span className="h-px flex-1 bg-border-gold" />
    </div>
  );
}
