'use client';

import { Command } from 'cmdk';
import { Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { safeGet, safeSet } from '@/lib/use-media-query';
import { useActiveWorkspace } from '@/lib/active-workspace';
import { useProjects } from '@/services/hooks';

const RECENT_KEY = 'testbuddy.recentProjects';
function recent(): string[] {
  try { return JSON.parse(safeGet(RECENT_KEY) ?? '[]') as string[]; } catch { return []; }
}
export function rememberProject(id: string): void {
  safeSet(RECENT_KEY, JSON.stringify([id, ...recent().filter((x) => x !== id)].slice(0, 5)));
}

/** Workspace + project switcher: searchable, recent first. */
export function ProjectSwitcher() {
  const params = useParams<{ projectId?: string }>();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { workspace, workspaces, setWorkspaceId } = useActiveWorkspace();
  const projects = useProjects(workspace?.id, { includeArchived: true });
  const rec = recent();
  const list = [...(projects.data ?? [])].sort((a, b) => (rec.indexOf(a.project.id) + 100) % 100 - (rec.indexOf(b.project.id) + 100) % 100);
  const current = projects.data?.find((p) => p.project.id === params.projectId);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Switch project" className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-md px-2 text-base hover:bg-sunken">
          <span className="max-w-28 truncate font-medium text-ink sm:max-w-40">{current?.project.name ?? workspace?.name ?? 'Projects'}</span>
          {current ? <span className="hidden font-mono text-xs text-ink-muted sm:inline">{current.project.ref_prefix}</span> : null}
          <ChevronsUpDown className="size-4 text-ink-muted" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command label="Projects">
          {workspaces.length > 1 ? (
            <div className="border-b border-subtle p-2">
              <select aria-label="Workspace" value={workspace?.id} onChange={(e) => setWorkspaceId(e.target.value)} className="min-h-8 w-full rounded-md border-[1.5px] border-strong bg-surface px-2 text-base">
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          ) : null}
          <Command.Input placeholder="Search projects" className="w-full border-b border-subtle bg-transparent px-3 py-2 text-base outline-none" />
          <Command.List className="max-h-72 overflow-auto p-1">
            <Command.Empty className="px-3 py-2 text-sm text-ink-muted">No projects found</Command.Empty>
            {list.map(({ project, my_role }) => (
              <Command.Item key={project.id} value={`${project.name} ${project.ref_prefix}`} onSelect={() => { setOpen(false); rememberProject(project.id); router.push(`/p/${project.id}`); }}
                className="flex min-h-9 cursor-default items-center gap-2 rounded-sm px-2 text-base data-[selected=true]:bg-sunken">
                <span className="flex-1 truncate">{project.name}</span>
                {project.is_archived ? <Badge>Archived</Badge> : null}
                <span className="font-mono text-xs text-ink-muted">{project.ref_prefix}</span>
                {project.id === params.projectId ? <Check className="size-4" aria-hidden /> : null}
                <span className="sr-only">{my_role}</span>
              </Command.Item>
            ))}
          </Command.List>
          {workspace ? <div className="border-t border-subtle p-1"><Link href="/projects" onClick={() => setOpen(false)} className="block rounded-sm px-2 py-1.5 text-sm text-accent-text hover:bg-sunken">All projects in {workspace.name}</Link></div> : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
