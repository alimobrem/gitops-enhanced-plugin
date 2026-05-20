import { test, expect } from '@playwright/test';
import { login, consoleUrl } from './helpers';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(consoleUrl('/gitops/settings'));
    await page.waitForTimeout(3000);
  });

  test('loads settings page', async ({ page }) => {
    await expect(page.locator('h1:has-text("GitOps Settings")')).toBeVisible({ timeout: 15000 });
  });

  test('has all tabs', async ({ page }) => {
    for (const tab of ['ArgoCD Instances', 'Repositories', 'Clusters']) {
      await expect(page.locator(`text=${tab}`)).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('AppProject List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(consoleUrl('/k8s/all-namespaces/argoproj.io~v1alpha1~AppProject'));
    await page.waitForTimeout(3000);
  });

  test('shows default project', async ({ page }) => {
    await expect(page.locator('text=default')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('AppProject Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(consoleUrl('/k8s/ns/openshift-gitops/argoproj.io~v1alpha1~AppProject/default'));
    await page.waitForTimeout(3000);
  });

  test('shows project name and tabs', async ({ page }) => {
    await expect(page.locator('h1:has-text("default")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Source Repos')).toBeVisible();
    await expect(page.locator('text=Destinations')).toBeVisible();
  });
});
