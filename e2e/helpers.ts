import { type Page } from '@playwright/test';

const CONSOLE_URL = process.env.CONSOLE_URL ?? 'https://console-openshift-console.apps.aws-jb-acsacm-1.dev05.red-chesterfield.com';

export async function login(page: Page) {
  await page.goto(CONSOLE_URL);

  // OCP login page — click "kube:admin" or fill credentials
  // The temporary admin user uses "Log in with kube:admin"
  try {
    // Wait for either the login page or the console (already logged in)
    const loginButton = page.locator('a:has-text("kube:admin"), a:has-text("Log in"), button:has-text("Log in")');
    const consoleNav = page.locator('[data-test-id="page-sidebar"]');

    await Promise.race([
      loginButton.first().waitFor({ timeout: 10000 }),
      consoleNav.waitFor({ timeout: 10000 }),
    ]);

    if (await loginButton.first().isVisible()) {
      await loginButton.first().click();
      // May redirect to OAuth page
      const usernameField = page.locator('#inputUsername');
      if (await usernameField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await usernameField.fill('kubeadmin');
        await page.locator('#inputPassword').fill(process.env.KUBEADMIN_PASSWORD ?? '');
        await page.locator('button[type="submit"]').click();
      }
    }

    // Wait for console to load
    await page.waitForURL('**/k8s/**', { timeout: 30000 }).catch(() => {});
  } catch {
    // Already logged in or login flow differs
  }
}

export function consoleUrl(path: string): string {
  return `${CONSOLE_URL}${path}`;
}
