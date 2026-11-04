'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { useCases, useMilestones, useRuns } from '@/services/hooks';

export interface GlobalSearchProps { open: boolean; onOpenChange: (open: boolean) => void; projectId?: string }

/** Cases by ref/title, runs and milestones in the current project. Opened with `/` or Cmd/Ctrl+K. */
export function GlobalSearch({ open, onOpenChange, projectId }: GlobalSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q.trim());
  const on = open && !!projectId && dq.length > 0;
  const cases = useCases(on ? { projectId: projectId as string, q: dq, pageSize: 6 } : undefined);
  const runs = useRuns(on ? { projectId: projectId as string, q: dq, state: 'all' } : undefined);
  const milestones = useMilestones(on ? projectId : undefined);
  const go = (href: string) => { onOpenChange(false); setQ(''); router.push(href); };
  const ms = (milestones.data ?? []).filter((m) => m.milestone.title.toLowerCase().includes(dq.toLowerCase())).slice(0, 5);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Search" className="top-[20%] -translate-y-0 p-0">
      {projectId ? (
        <Command shouldFilter={false} label="Search cases, runs and milestones">
          <div className="flex items-center gap-2 border-b border-subtle px-3">
            <Search className="size-4 text-ink-muted" aria-hidden />
            <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Search cases, runs, milestones" className="min-h-11 flex-1 bg-transparent text-base outline-none" />
          </div>
          <Command.List className="max-h-80 overflow-auto p-1">
            {dq ? <Command.Empty className="px-3 py-4 text-sm text-ink-muted">Nothing matches &quot;{dq}&quot;.</Command.Empty> : <div className="px-3 py-4 text-sm text-ink-muted">Type a case reference, title, run or milestone name.</div>}
            {(cases.data?.items ?? []).length > 0 ? <Command.Group heading="Cases" className="text-xs text-ink-muted">
              {cases.data?.items.map(({ case: c }) => (
                <Command.Item key={c.id} value={c.id} onSelect={() => go(`/p/${projectId}/cases?case=${c.id}`)} className="flex min-h-9 items-center gap-2 rounded-sm px-2 text-base text-ink data-[selected=true]:bg-sunken">
                  <span className="font-mono text-sm text-ink-muted">{c.ref}</span><span className="truncate">{c.title}</span>
                </Command.Item>
              ))}
            </Command.Group> : null}
            {(runs.data ?? []).length > 0 ? <Command.Group heading="Runs" className="text-xs text-ink-muted">
              {runs.data?.map(({ run }) => (
                <Command.Item key={run.id} value={run.id} onSelect={() => go(`/p/${projectId}/runs/${run.id}`)} className="flex min-h-9 items-center rounded-sm px-2 text-base text-ink data-[selected=true]:bg-sunken">{run.name}</Command.Item>
              ))}
            </Command.Group> : null}
            {ms.length > 0 ? <Command.Group heading="Milestones" className="text-xs text-ink-muted">
              {ms.map(({ milestone }) => (
                <Command.Item key={milestone.id} value={milestone.id} onSelect={() => go(`/p/${projectId}/milestones/${milestone.id}`)} className="flex min-h-9 items-center rounded-sm px-2 text-base text-ink data-[selected=true]:bg-sunken">{milestone.title}</Command.Item>
              ))}
            </Command.Group> : null}
          </Command.List>
        </Command>
      ) : <p className="p-4 text-base text-ink-muted">Open a project to search its cases, runs and milestones.</p>}
    </Dialog>
  );
}
