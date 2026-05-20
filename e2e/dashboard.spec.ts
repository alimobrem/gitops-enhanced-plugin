import { test, expect } from '@playwright/test';
import { login, consoleUrl } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(consoleUrl('/gitops/dashboard'));
    await page.waitForTimeout(3000);
  });

  test('shows status cards', async ({ page }) => {
    await expect(page.locator('text=Total Applications')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Synced').first()).toBeVisible();
  });

  test('shows sync and health progress bars', async ({ page }) => {
    await expect(page.locator('text=Sync Status')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Health Status')).toBeVisible();
  });

  test('shows recent applications table', async ({ page }) => {
    await expect(page.locator('text=Recent Applications')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=guestbook')).toBeVisible();
  });

  test('shows resource counts', async ({ page }) => {
    await expect(page.locator('text=ApplicationSets')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=AppProjects')).toBeVisible();
    await expect(page.locator('text=ArgoCD Instances')).toBeVisible();
  });
});
