import { test, expect } from '@playwright/test';
import { login, consoleUrl } from './helpers';

test.describe('Application List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(consoleUrl('/k8s/all-namespaces/argoproj.io~v1alpha1~Application'));
    await page.waitForTimeout(3000);
  });

  test('shows guestbook application', async ({ page }) => {
    await expect(page.locator('text=guestbook')).toBeVisible({ timeout: 15000 });
  });

  test('shows sync status column', async ({ page }) => {
    await expect(page.locator('text=Sync Status')).toBeVisible({ timeout: 15000 });
  });

  test('shows health column', async ({ page }) => {
    await expect(page.locator('text=Health')).toBeVisible({ timeout: 15000 });
  });

  test('shows Create Application button', async ({ page }) => {
    await expect(page.locator('text=Create Application')).toBeVisible({ timeout: 15000 });
  });

  test('has filter toolbar', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Filter by name"]')).toBeVisible({ timeout: 15000 });
  });

  test('row kebab menu opens', async ({ page }) => {
    const kebab = page.locator('[aria-label="Actions"]').first();
    await expect(kebab).toBeVisible({ timeout: 15000 });
    await kebab.click();
    await expect(page.locator('text=Sync')).toBeVisible();
    await expect(page.locator('text=Refresh')).toBeVisible();
    await expect(page.locator('text=Delete')).toBeVisible();
  });
});
