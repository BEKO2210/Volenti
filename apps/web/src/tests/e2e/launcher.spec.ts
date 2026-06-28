import { test, expect } from '@playwright/test';

test.describe('Intent launcher', () => {
  test('shows the launcher and classifies a text intent', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Sag, was du möchtest.' })).toBeVisible();

    const input = page.getByLabel('Ich möchte…');
    await input.fill('Schreibe eine freundliche E-Mail an mein Team');
    await page.getByRole('button', { name: 'Erkennen' }).click();

    await expect(page.getByText('Erkannter Typ:')).toBeVisible();
    await expect(page.getByText('Text', { exact: true })).toBeVisible();
  });

  test('rejects too-short input with a validation message', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Ich möchte…').fill('a');
    await page.getByRole('button', { name: 'Erkennen' }).click();
    await expect(page.locator('#intent-error')).toBeVisible();
  });
});
