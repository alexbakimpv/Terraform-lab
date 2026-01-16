import { test, expect } from '@playwright/test';
import { credentials, login, allowMutations } from './helpers';

const adminInviteEmail = process.env.E2E_ADMIN_INVITE_EMAIL || '';

test.describe('admin dashboard', () => {
  test.skip(!credentials.adminEmail || !credentials.password, 'Admin credentials missing');

  test('participants list renders and invite modal opens', async ({ page }) => {
    await login(page, credentials.adminEmail, credentials.password);
    await expect(page.getByText('OVERLORD CONSOLE')).toBeVisible();

    await expect(page.getByRole('button', { name: 'INVITE PARTICIPANT' })).toBeVisible();
    await page.getByRole('button', { name: 'INVITE PARTICIPANT' }).click();
    await expect(page.getByText('DEPLOY NEW PARTICIPANTS')).toBeVisible();
    await page.getByRole('button', { name: 'CANCEL' }).click();
  });

  test('admin invite validates domain', async ({ page }) => {
    await login(page, credentials.adminEmail, credentials.password);
    await page.getByRole('button', { name: 'ADMIN MANAGEMENT' }).click();

    await page.getByRole('button', { name: 'INVITE ADMIN' }).click();
    await page.getByPlaceholder('admin@imperva.com').fill('test@gmail.com');
    await page.getByRole('button', { name: 'SEND INVITE' }).click();
    await expect(page.getByText('Admin emails must be @imperva.com')).toBeVisible();
  });

  test('admin invite (optional)', async ({ page }) => {
    test.skip(!allowMutations || !adminInviteEmail, 'Set E2E_ALLOW_MUTATIONS=1 and E2E_ADMIN_INVITE_EMAIL');

    await login(page, credentials.adminEmail, credentials.password);
    await page.getByRole('button', { name: 'ADMIN MANAGEMENT' }).click();
    await page.getByRole('button', { name: 'INVITE ADMIN' }).click();
    await page.getByPlaceholder('admin@imperva.com').fill(adminInviteEmail);
    await page.getByRole('button', { name: 'SEND INVITE' }).click();
    await expect(page.getByText(/INVITE SENT/i)).toBeVisible();
  });

  test('audit logs view and filters render', async ({ page }) => {
    await login(page, credentials.adminEmail, credentials.password);
    await page.getByRole('button', { name: 'SYSTEM AUDIT' }).click();
    await expect(page.getByText('CENTRALIZED AUDIT LOGGING')).toBeVisible();

    await page.getByRole('button', { name: 'ADMIN' }).click();
    await expect(page.getByPlaceholder('SEARCH LOGS...')).toBeVisible();
  });
});
