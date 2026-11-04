'use client';

import * as RD from '@radix-ui/react-dialog';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { TourProvider } from '@/guide/tour';
import { KeyboardHelp } from '@/components/tb/keyboard-help';
import { Skeleton } from '@/components/ui/skeleton';
import { useHotkeys } from '@/lib/hotkeys';
import { safeGet, safeSet, useMediaQuery } from '@/lib/use-media-query';
import { useMyProjectRole, useSession } from '@/services/hooks';
import { GlobalSearch } from './global-search';
import { NAV_ITEMS } from './nav-config';
import { ProjectSidebar } from './project-sidebar';
import { ProjectSwitcher } from './project-switcher';
import { Topbar } from './topbar';
import { UserMenu } from './user-menu';

/**
 * Shell for every signed-in route: topbar + (project) sidebar + scrolling main. Redirects to /sign-in without a session.
 * Under 1024px the sidebar becomes a slide-over.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId?: string }>();
  const session = useSession();
  const role = useMyProjectRole(projectId).data ?? null;
  const desktop = useMediaQuery('(min-width: 1024px)', true);
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && safeGet('testbuddy.sidebarCollapsed') === '1');
  const [navOpen, setNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (session.isSuccess && !session.data) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }, [session.isSuccess, session.data, router, pathname]);

  const goMap = Object.fromEntries(NAV_ITEMS.filter((i) => i.goKey).map((i) => [`g ${i.goKey}`, { label: `Go to ${i.label}`, run: () => { if (projectId) router.push(`/p/${projectId}${i.path}`); } }]));
  useHotkeys('Global', {
    '?': { label: 'Show keyboard shortcuts', run: () => setHelpOpen(true) },
    '/': { label: 'Search', run: () => setSearchOpen(true) },
    'mod+k': { label: 'Search', run: () => setSearchOpen(true) },
    ...goMap,
  });

  if (session.isLoading || !session.data) {
    return <div className="p-6" role="status" aria-label="Loading"><Skeleton className="mb-4 h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  const toggle = () => setCollapsed((c) => { safeSet('testbuddy.sidebarCollapsed', c ? '0' : '1'); return !c; });
  const sidebarW = collapsed ? 'var(--tb-sidebar-w-collapsed)' : 'var(--tb-sidebar-w)';

  return (
    <TourProvider projectId={projectId} role={role} userId={session.data.user?.id}>
    <div className="min-h-dvh bg-grouped">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-2">Skip to content</a>
      <Topbar
        projectId={projectId} role={role} switcher={<ProjectSwitcher />} onSearch={() => setSearchOpen(true)} onHelp={() => setHelpOpen(true)}
        onMenu={projectId && !desktop ? () => setNavOpen(true) : undefined}
        user={<UserMenu role={role} onOpenHelp={() => setHelpOpen(true)} />}
      />
      <div className="flex">
        {projectId && desktop ? (
          <aside style={{ width: sidebarW }} className="sticky top-[var(--tb-topbar-h)] h-[calc(100dvh-var(--tb-topbar-h))] shrink-0 border-r border-[var(--tb-sidebar-border)] bg-[var(--tb-sidebar-bg)]">
            <ProjectSidebar projectId={projectId} role={role} collapsed={collapsed} onToggle={toggle} />
          </aside>
        ) : null}
        <main id="main" className="min-w-0 flex-1 p-3 md:p-[14px] lg:p-5">{children}</main>
      </div>
      {projectId && !desktop ? (
        <RD.Root open={navOpen} onOpenChange={setNavOpen}>
          <RD.Portal>
            <RD.Overlay className="fixed inset-0 z-50 bg-[var(--tb-overlay)]" />
            <RD.Content className="fixed inset-y-0 left-0 z-50 w-[var(--tb-sidebar-w)] bg-canvas shadow-lg">
              <RD.Title className="sr-only">Navigation</RD.Title>
              <RD.Description className="sr-only">Project navigation</RD.Description>
              <ProjectSidebar projectId={projectId} role={role} onNavigate={() => setNavOpen(false)} />
            </RD.Content>
          </RD.Portal>
        </RD.Root>
      ) : null}
      <KeyboardHelp open={helpOpen} onOpenChange={setHelpOpen} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} projectId={projectId} />
    </div>
    </TourProvider>
  );
}
