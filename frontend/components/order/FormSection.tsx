import type { ReactNode } from 'react';

interface FormSectionProps {
  id?: string;
  index: string;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Echoes the "01 / 02 / 03" numbering style from the homepage's
 * ProcessSection, so the order form reads as part of the same brand
 * system rather than a bolted-on generic form. */
export function FormSection({ id, index, title, description, children }: FormSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-12 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-4">
        <span className="font-display text-xl text-gold">{index}</span>
        <h2 className="font-display text-2xl text-ink">{title}</h2>
      </div>
      {description && (
        <p className="mt-2 max-w-prose text-sm text-ink-muted">{description}</p>
      )}
      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </section>
  );
}
