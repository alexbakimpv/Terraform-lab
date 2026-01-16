import { test, expect } from '@playwright/test';
import { credentials, login, allowMutations } from './helpers';

test.describe('student mission control', () => {
  test.skip(!credentials.studentEmail || !credentials.password, 'Student credentials missing');

  test('lab details render and attack client link is available when provisioned', async ({ page }) => {
    await login(page, credentials.studentEmail, credentials.password);

    await expect(page.getByText('Assigned Lab Environment')).toBeVisible();
    await expect(page.getByText('Target lab URL')).toBeVisible();
    await expect(page.getByText('Attack Client')).toBeVisible();

    const clientLink = page.locator('a[target="_blank"]');
    if (await clientLink.count()) {
      await expect(clientLink.first()).toHaveAttribute(/href/i, /https?:\/\//);
    } else {
      await expect(page.getByText('Not available')).toBeVisible();
    }
  });

  test('extend and reset actions (optional)', async ({ page }) => {
    test.skip(!allowMutations, 'Set E2E_ALLOW_MUTATIONS=1 to run');

    await login(page, credentials.studentEmail, credentials.password);

    await page.getByRole('button', { name: '+ EXTEND' }).click();
    await expect(page.getByRole('button', { name: '+ EXTEND' })).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'RESET LAB ENVIRONMENT' }).click();
    await expect(page.getByText(/SYSTEM REBOOTING/i)).toBeVisible();
  });
});
