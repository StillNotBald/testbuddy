import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-sunken motion-reduce:animate-none', className)} />;
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-subtle rounded-md border border-subtle bg-surface">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-11 items-center gap-4 px-3">
          {Array.from({ length: cols }, (_, c) => <Skeleton key={c} className={cn('h-3', c === 1 ? 'flex-[3]' : 'flex-1')} />)}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3 rounded-md border border-subtle bg-surface p-4 shadow-sm">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className="h-3 w-full" />)}
    </div>
  );
}
