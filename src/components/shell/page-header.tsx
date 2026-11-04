import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
            {c.href && i < items.length - 1 ? <Link href={c.href} className="rounded-xs hover:text-ink hover:underline">{c.label}</Link> : <span aria-current={i === items.length - 1 ? 'page' : undefined} className={i === items.length - 1 ? 'text-ink-secondary' : undefined}>{c.label}</span>}
            {i < items.length - 1 ? <ChevronRight className="size-3.5" aria-hidden /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface PageHeaderProps {
  title: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Tab strip rendered below (use <Tabs>). */
  tabs?: ReactNode;
  breadcrumbs?: Crumb[];
}

/** Title (h1), badge, meta line, right-aligned actions, optional tab strip. */
export function PageHeader({ title, badge, meta, actions, tabs, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="mb-4">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink">{title}</h1>
            {badge}
          </div>
          {meta ? <div className="mt-1 text-sm text-ink-muted">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {tabs ? <div className="mt-3">{tabs}</div> : null}
    </header>
  );
}
