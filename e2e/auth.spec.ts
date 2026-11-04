import { test, expect } from '@playwright/test';
import { CORE, USERS, chooseMenuItem, openUserMenu, signInAs, type RoleKey } from './helpers';

test.describe('sign-in picker', () => {
  test('lists the demo users with their CORE role, inactive user is marked Disabled', async ({ page }) => {
    await page.goto('/sign-in');
    for (const u of Object.values(USERS)) {
      const btn = page.getByRole('button', { name: new RegExp(`Sign in as ${u.name}`) });
      await expect(btn).toBeVisible();
      await expect(btn).toContainText(u.label);
    }
    await expect(page.getByRole('button', { name: /Sign in as Pat Doe/ })).toContainText('Disabled');
  });

  for (const role of Object.keys(USERS) as RoleKey[]) {
    test(`sign in as ${role}`, async ({ page }) => {
      await signInAs(page, role);
      // Home opens the last or first project (no dead end), else the project list.
      await expect(page).toHaveURL(/\/(p\/[^/]+|projects)$/);
      await openUserMenu(page);
      await expect(page.getByText(USERS[role].email)).toBeVisible();
    });
  }

  test('inactive user cannot sign in', async ({ page }) => {
    await page.goto('/sign-in');
    // Disabled accounts are shown but cannot be chosen, with the reason underneath.
    await expect(page.getByRole('button', { name: /Sign in as Pat Doe/ })).toBeDisabled();
    await expect(page.getByText('Disabled accounts cannot sign in.', { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('"next" is honoured after sign-in', async ({ page }) => {
    await signInAs(page, 'tester', `${CORE}/cases`);
    await expect(page).toHaveURL(new RegExp(`${CORE}/cases$`));
  });

  test('sign out returns to the picker', async ({ page }) => {
    await signInAs(page, 'viewer');
    await openUserMenu(page);
    await chooseMenuItem(page, 'Sign out');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe('signed out', () => {
  for (const path of ['/projects', CORE, `${CORE}/cases`, `${CORE}/settings`]) {
    test(`${path} redirects to sign-in with next`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/sign-in\\?next=${encodeURIComponent(path).replace(/\//g, '%2F')}`));
      await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
    });
  }
});
