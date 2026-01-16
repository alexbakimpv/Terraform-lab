import { expect, Page } from '@playwright/test';

export const credentials = {
  adminEmail: process.env.E2E_ADMIN_EMAIL || '',
  studentEmail: process.env.E2E_STUDENT_EMAIL || '',
  password: process.env.E2E_PASSWORD || '',
};

export const allowMutations = process.env.E2E_ALLOW_MUTATIONS === '1';
const apiBaseUrl = process.env.E2E_API_BASE_URL || '';

async function handleZscaler(page: Page) {
  const interstitialHeading = page.getByText(/are you sure you want to visit this site/i);
  const continueButton = page.getByRole('button', { name: /continue/i });

  const visible = await interstitialHeading.isVisible().catch(() => false);
  if (!visible) return;

  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
    await page.waitForLoadState('domcontentloaded');
  }
}

async function preflightZscaler(page: Page) {
  if (!apiBaseUrl) return;
  await page.goto(apiBaseUrl, { waitUntil: 'domcontentloaded' });
  await handleZscaler(page);
}

export async function resetSession(page: Page) {
  await preflightZscaler(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await handleZscaler(page);
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await handleZscaler(page);
}

export async function login(page: Page, email: string, password: string) {
  await resetSession(page);
  await page.getByPlaceholder('EMAIL').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByPlaceholder('EMAIL').fill(email);
  await page.getByPlaceholder('PASSWORD').fill(password);
  await page.getByRole('button', { name: 'AUTHENTICATE' }).click();
  const criticalFailure = page.getByRole('heading', { name: /critical failure/i });
  if (await criticalFailure.isVisible().catch(() => false)) {
    const message = await page
      .locator('text=/invalid email or password|unauthorized|forbidden/i')
      .first()
      .textContent()
      .catch(() => 'Login failed');
    throw new Error(`Login failed: ${message?.trim() || 'unknown error'}`);
  }
  await expect(page.getByRole('button', { name: 'LOGOUT' })).toBeVisible();
}

export async function logout(page: Page) {
  const logoutButton = page.getByRole('button', { name: 'LOGOUT' });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }
}
