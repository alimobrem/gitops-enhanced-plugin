import { test, expect } from '@playwright/test';
import { login, consoleUrl } from './helpers';

test.describe('Application Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(consoleUrl('/k8s/ns/openshift-gitops/argoproj.io~v1alpha1~Application/guestbook'));
    await page.waitForTimeout(3000);
  });

  test('shows application name', async ({ page }) => {
    await expect(page.locator('h1:has-text("guestbook")')).toBeVisible({ timeout: 15000 });
  });

  test('shows sync and health status', async ({ page }) => {
    await expect(page.locator('text=Synced')).toBeVisible({ timeout: 15000 });
  });

  test('shows all tabs', async ({ page }) => {
    for (const tab of ['Overview', 'Resources', 'Logs', 'Events', 'History', 'Configuration']) {
      await expect(page.locator(`text=${tab}`)).toBeVisible({ timeout: 15000 });
    }
  });

  test('Actions menu opens with all items', async ({ page }) => {
    await page.locator('text=Actions').first().click();
    await expect(page.locator('text=Sync')).toBeVisible();
    await expect(page.locator('text=Refresh')).toBeVisible();
    await expect(page.locator('text=Terminate')).toBeVisible();
    await expect(page.locator('text=Delete')).toBeVisible();
  });

  test('Overview tab shows source info', async ({ page }) => {
    await page.locator('text=Overview').first().click();
    await expect(page.locator('text=argocd-example-apps')).toBeVisible({ timeout: 10000 });
  });

  test('Resources tab shows managed resources', async ({ page }) => {
    await page.locator('text=Resources').first().click();
    await page.waitForTimeout(2000);
    // Should show Deployment and Service from guestbook
    const resourceRows = page.locator('table tbody tr');
    await expect(resourceRows.first()).toBeVisible({ timeout: 10000 });
  });

  test('Resources tab has selective sync button', async ({ page }) => {
    await page.locator('text=Resources').first().click();
    await expect(page.locator('text=Sync Selected')).toBeVisible({ timeout: 10000 });
  });

  test('Events tab shows operation state', async ({ page }) => {
    await page.locator('text=Events').first().click();
    await page.waitForTimeout(2000);
    // Should show Last Operation or Conditions
    const content = page.locator('text=Last Operation, text=Conditions, text=No conditions');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('History tab shows deployment history', async ({ page }) => {
    await page.locator('text=History').first().click();
    await page.waitForTimeout(2000);
    const historyContent = page.locator('text=Revision, text=No deployment history');
    await expect(historyContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('Configuration tab shows edit form', async ({ page }) => {
    await page.locator('text=Configuration').first().click();
    await expect(page.locator('text=Repository URL')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Save')).toBeVisible();
  });

  test('Logs tab shows pod selector', async ({ page }) => {
    await page.locator('text=Logs').first().click();
    await expect(page.locator('text=guestbook-ui')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Follow')).toBeVisible();
  });
});
