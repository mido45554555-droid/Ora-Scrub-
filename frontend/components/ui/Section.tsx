import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Consistent max-width + horizontal padding wrapper, logical properties
 * so it behaves identically in RTL and LTR without extra rules. */
export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mx-auto max-w-6xl px-6', className)}
      {...props}
    />
  );
}

/** Vertical rhythm wrapper for page sections — encodes the "generous
 * editorial spacing" principle in one place instead of repeating
 * py-24/py-32 throughout every page. */
export function Section({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={cn('py-section', className)} {...props} />;
}
