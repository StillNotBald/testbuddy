import { expect, type Page } from '@playwright/test';

/** Demo users from src/services/mock/fixtures.ts. CORE roles: Avery admin, Raj manager, Dana tester, Mia viewer. */
export const USERS = {
  admin: { name: 'Avery Quinn', email: 'avery@example.test', label: 'Admin' },
  manager: { name: 'Raj Patel', email: 'raj@example.test', label: 'Manager' },
  tester: { name: 'Dana Lee', email: 'dana@example.test', label: 'Tester' },
  viewer: { name: 'Mia Chen', email: 'mia@example.test', label: 'Viewer' },
} as const;
export type RoleKey = keyof typeof USERS;

export const CORE = '/p/prj_core';
export const MOCKDB_KEY = 'testbuddy.mockdb.v1';

/** Sign in through the demo picker and wait to leave /sign-in. */
export async function signInAs(page: Page, role: RoleKey, next?: string) {
  await page.goto(next ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in');
  await page.getByRole('button', { name: new RegExp(`Sign in as ${USERS[role].name}`) }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'));
}

/** Under 1024px the project nav is a slide-over behind "Open navigation". Returns the nav landmark. */
export async function openProjectNav(page: Page) {
  // The shell decides desktop vs slide-over from a media query after hydration, so decide from the viewport, not from what is visible yet.
  if ((page.viewportSize()?.width ?? 1280) < 1024) await page.getByRole('button', { name: 'Open navigation' }).click();
  const nav = page.getByRole('navigation', { name: 'Project', exact: true });
  await expect(nav).toBeVisible();
  return nav;
}

/**
 * Open the account menu. Uses focus + Enter instead of a pointer click: at 390px the topbar is wider than the
 * viewport (known app defect, see the render-check report) and the button sits off-screen, so a click can not reach it.
 */
export async function openUserMenu(page: Page) {
  const trigger = page.getByRole('button', { name: 'User menu' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
}

/** Activate a menu item with the keyboard (the account menu is anchored to the off-screen trigger at 390px, see openUserMenu). */
export async function chooseMenuItem(page: Page, name: string | RegExp) {
  const item = page.getByRole('menuitem', { name });
  await item.focus();
  await page.keyboard.press('Enter');
}
