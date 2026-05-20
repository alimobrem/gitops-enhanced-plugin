import { test, expect } from '@playwright/test';
import { login, consoleUrl } from './helpers';

test.describe('ApplicationSet Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('wizard loads at /gitops/create-appset', async ({ page }) => {
    await page.goto(consoleUrl('/gitops/create-appset'));
    await expect(page.locator('h1:has-text("Create ApplicationSet")')).toBeVisible({ timeout: 15000 });
  });

  test('shows wizard steps', async ({ page }) => {
    await page.goto(consoleUrl('/gitops/create-appset'));
    await expect(page.locator('text=Basics')).toBeVisible({ timeout: 15000 });
  });

  test('has name input field', async ({ page }) => {
    await page.goto(consoleUrl('/gitops/create-appset'));
    await expect(page.locator('input#name')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('AppProject Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('wizard loads at /gitops/create-project', async ({ page }) => {
    await page.goto(consoleUrl('/gitops/create-project'));
    await expect(page.locator('h1:has-text("Create AppProject")')).toBeVisible({ timeout: 15000 });
  });

  test('shows allow all repos checkbox', async ({ page }) => {
    await page.goto(consoleUrl('/gitops/create-project'));
    await expect(page.locator('text=Allow all repositories')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Rollout Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('wizard loads at /gitops/create-rollout', async ({ page }) => {
    await page.goto(consoleUrl('/gitops/create-rollout'));
    await expect(page.locator('h1:has-text("Create Rollout")')).toBeVisible({ timeout: 15000 });
  });

  test('shows strategy step with Canary option', async ({ page }) => {
    await page.goto(consoleUrl('/gitops/create-rollout'));
    await expect(page.locator('text=Canary')).toBeVisible({ timeout: 15000 });
  });
});
