import { test, expect } from '@playwright/test';
import { credentials, login, resetSession, logout } from './helpers';

const badPassword = process.env.E2E_BAD_PASSWORD || 'bad-password';

test.describe('auth', () => {
  test.skip(!credentials.password, 'E2E_PASSWORD is required');

  test('admin login persists and logout works', async ({ page }) => {
    test.skip(!credentials.adminEmail, 'E2E_ADMIN_EMAIL is required');

    await login(page, credentials.adminEmail, credentials.password);
    await expect(page.getByText('OVERLORD CONSOLE')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'LOGOUT' })).toBeVisible();
    await expect(page.getByText('OVERLORD CONSOLE')).toBeVisible();

    await logout(page);
    await expect(page.getByRole('button', { name: 'AUTHENTICATE' })).toBeVisible();
  });

  test('student login persists', async ({ page }) => {
    test.skip(!credentials.studentEmail, 'E2E_STUDENT_EMAIL is required');

    await login(page, credentials.studentEmail, credentials.password);
    await expect(page.getByText('AMPLIFY LAUNCHPAD')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'LOGOUT' })).toBeVisible();
    await expect(page.getByText('AMPLIFY LAUNCHPAD')).toBeVisible();
  });

  test('invalid password shows error', async ({ page }) => {
    test.skip(!credentials.studentEmail, 'E2E_STUDENT_EMAIL is required');

    await resetSession(page);
    await page.getByPlaceholder('EMAIL').fill(credentials.studentEmail);
    await page.getByPlaceholder('PASSWORD').fill(badPassword);
    await page.getByRole('button', { name: 'AUTHENTICATE' }).click();

    await expect(
      page.getByText(/login failed|invalid|unauthorized/i)
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'AUTHENTICATE' })).toBeVisible();
  });
});
