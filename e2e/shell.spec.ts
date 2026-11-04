import { test, expect } from '@playwright/test';
import { CORE, MOCKDB_KEY, USERS, chooseMenuItem, openProjectNav, openUserMenu, signInAs, type RoleKey } from './helpers';

/** Mirrors src/lib/permissions.ts and src/components/shell/nav-config.ts. */
const ALWAYS = ['Overview', 'Repository', 'Milestones', 'Runs', 'Reports', 'Automation'];
const ADMIN_ITEMS: Record<RoleKey, string[]> = {
  admin: ['Members', 'Audit log', 'Settings'], // members.view, audit.view, settings.announcement
  manager: ['Members', 'Settings'], // no audit.view
  tester: [],
  viewer: [],
};
const ALL_ADMIN_ITEMS = ['Members', 'Audit log', 'Settings'];

test.describe('role-filtered sidebar', () => {
  for (const role of Object.keys(USERS) as RoleKey[]) {
    test(`${role} sees the right items`, async ({ page }) => {
      await signInAs(page, role, CORE);
      const nav = await openProjectNav(page);
      for (const label of ALWAYS) await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
      for (const label of ALL_ADMIN_ITEMS) {
        const link = nav.getByRole('link', { name: label, exact: true });
        if (ADMIN_ITEMS[role].includes(label)) await expect(link).toBeVisible();
        else await expect(link).toHaveCount(0);
      }
    });
  }
});

test.describe('global search and help', () => {
  test.beforeEach(async ({ page }) => { await signInAs(page, 'tester', CORE); await expect(page.getByRole('main')).toBeVisible(); });

  test('/ opens global search', async ({ page }) => {
    await page.keyboard.press('/');
    await expect(page.getByPlaceholder('Search cases, runs, milestones')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Search cases, runs, milestones')).toHaveCount(0);
  });

  test('Cmd/Ctrl+K opens global search', async ({ page }) => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByPlaceholder('Search cases, runs, milestones')).toBeVisible();
  });

  test('? opens keyboard help', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByPlaceholder('Search shortcuts')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Search shortcuts')).toHaveCount(0);
  });
});

test.describe('theme', () => {
  test('toggle persists across reload', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile-390', 'Phones follow the system theme; the toggle is desktop and tablet only.');
    await signInAs(page, 'viewer');
    await page.getByRole('button', { name: /^Theme:/ }).click();
    await page.getByRole('menuitem', { name: /^Dark/ }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Theme: dark' }).click();
    await page.getByRole('menuitem', { name: /^Light/ }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});

const renameCore = (args: { key: string; to: string }) => {
  const env = JSON.parse(localStorage.getItem(args.key)!);
  env.data.projects.find((p: { id: string }) => p.id === 'prj_core').name = args.to;
  localStorage.setItem(args.key, JSON.stringify(env));
};

test.describe('mock DB', () => {
  test('persists across reload and session survives', async ({ page }) => {
    await signInAs(page, 'admin', CORE);
    await expect(page.getByRole('button', { name: 'Switch project' })).toContainText('Core platform');
    await page.evaluate(renameCore, { key: MOCKDB_KEY, to: 'Persisted Name' });
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${CORE}$`)); // still signed in
    await expect(page.getByRole('button', { name: 'Switch project' })).toContainText('Persisted Name');
  });

  test('Reset demo data: cancel keeps edits, confirm restores the seed', async ({ page }) => {
    await signInAs(page, 'admin', CORE);
    await page.evaluate(renameCore, { key: MOCKDB_KEY, to: 'Edited Name' });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Switch project' })).toContainText('Edited Name');

    await openUserMenu(page);
    await chooseMenuItem(page, 'Reset demo data');
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog.getByText('Reset demo data?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog.getByText('Reset demo data?')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Switch project' })).toContainText('Edited Name');

    await openUserMenu(page);
    await chooseMenuItem(page, 'Reset demo data');
    // Keyboard activation: at 390px the page-overflow defect skews pointer hit-testing inside the dialog.
    await dialog.getByRole('button', { name: 'Reset demo data' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Demo data was reset.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch project' })).toContainText('Core platform');
  });
});
