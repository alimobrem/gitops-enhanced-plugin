import { test, expect } from '@playwright/test';
import { login, consoleUrl } from './helpers';

test.describe('Plugin loads', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('GitOps nav section is visible', async ({ page }) => {
    await page.goto(consoleUrl('/'));
    await page.waitForTimeout(5000);
    const gitopsNav = page.locator('text=GitOps');
    await expect(gitopsNav.first()).toBeVisible({ timeout: 30000 });
  });

  test('Dashboard page loads without errors', async ({ page }) => {
    await page.goto(consoleUrl('/gitops/dashboard'));
    await expect(page.locator('text=GitOps Overview')).toBeVisible({ timeout: 30000 });
    // No crash — check for error boundary text
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('Applications list page loads', async ({ page }) => {
    await page.goto(consoleUrl('/k8s/all-namespaces/argoproj.io~v1alpha1~Application'));
    await expect(page.locator('text=Applications')).toBeVisible({ timeout: 30000 });
  });
});
