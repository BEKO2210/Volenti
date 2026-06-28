import { test, expect } from '@playwright/test';

// Unique email per test to keep registrations idempotent across runs.
function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

test.describe('Landing', () => {
  test('shows the marketing hero and auth CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sag, was du möchtest.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kostenlos starten' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Anmelden' })).toBeVisible();
  });
});

test.describe('Auth flow', () => {
  test('register provisions a workspace, launcher works, logout protects /app', async ({
    page,
  }) => {
    const email = uniqueEmail();

    await page.goto('/register');
    await page.getByLabel('Name').fill('E2E Tester');
    await page.getByLabel('E-Mail').fill(email);
    await page.getByLabel('Passwort').fill('supersecret123');
    await page.getByRole('button', { name: 'Registrieren' }).click();

    // Lands in the protected workspace, bound to the new tenant.
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Was möchtest du erstellen?' })).toBeVisible();

    // Generation panel is wired up. Without ANTHROPIC_API_KEY configured (as in
    // CI), the backend honestly reports it is not configured — never a fake.
    await page.getByLabel('Ich möchte…').fill('Schreibe eine freundliche E-Mail');
    await page.getByRole('button', { name: 'Generieren' }).click();
    await expect(page.getByText(/noch nicht konfiguriert/)).toBeVisible();

    // Logout, then the protected route must redirect to login.
    await page.getByRole('button', { name: 'Abmelden' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/app');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  });

  test('unauthenticated visit to /app redirects to login', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login$/);
  });
});
