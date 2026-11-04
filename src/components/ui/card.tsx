import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-subtle bg-surface p-4 shadow-sm', className)} {...rest} />;
}
export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 flex items-center justify-between gap-2', className)} {...rest} />;
}
export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-ink', className)} {...rest} />;
}

export function StatCard({ label, value, delta, href, className }: { label: string; value: ReactNode; delta?: ReactNode; href?: string; className?: string }) {
  const body = (
    <>
      <div className="text-xs font-medium tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 text-kpi font-bold tabular-nums text-ink">{value}</div>
      {delta ? <div className="mt-1 text-sm text-ink-muted">{delta}</div> : null}
    </>
  );
  return href ? (
    <Link href={href} className={cn('block rounded-md border border-subtle bg-surface p-4 shadow-sm hover:bg-sunken', className)}>{body}</Link>
  ) : (
    <Card className={className}>{body}</Card>
  );
}
