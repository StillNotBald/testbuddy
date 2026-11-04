/** next/navigation stand-in for exec screen tests (vi.mock('next/navigation', () => import('./nav-mock'))). */
export const nav = { push: [] as string[], replace: [] as string[], search: '', path: '/p/prj_core/runs' };
export const useRouter = () => ({ push: (u: string) => { nav.push.push(u); }, replace: (u: string) => { nav.replace.push(u); }, back: () => {}, refresh: () => {}, prefetch: () => {} });
export const useSearchParams = () => new URLSearchParams(nav.search);
export const usePathname = () => nav.path;
export const useParams = () => ({});
