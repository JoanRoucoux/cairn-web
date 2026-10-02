import { type Page, expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { LoginPageObject } from './pages/login-page';

const AMUNDI_ID = '11111111-1111-1111-1111-111111111111';

type StartedAnimations = Window & { started: string[] };

const recordAnimations = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const record = window as unknown as StartedAnimations;
    record.started = [];
    document.addEventListener(
      'animationstart',
      (event) => {
        const target = event.target as Element;
        record.started.push(`${event.animationName}@${target.getAttribute('data-testid') ?? target.tagName}`);
      },
      true,
    );
  });

const started = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as StartedAnimations).started);

test.describe('login motion', () => {
  test('fades the two fields and the button up when the password form opens', async ({ page }) => {
    await mockApi(page);
    await page.route('**/api/session', (route) => route.fulfill({ status: 401, json: { message: 'unauthenticated' } }));
    const login = new LoginPageObject(page);
    await login.goto();
    await expect(login.passwordToggle).toBeVisible();
    await recordAnimations(page);

    await login.passwordToggle.click();

    await expect(login.username).toBeFocused();
    const names = await started(page);
    expect(names.filter((name) => name.startsWith('cairn-fade-up-in'))).toHaveLength(3);
  });

  test('spins the passkey button, keeping its width, while the system sheet is open', async ({ page }) => {
    await mockApi(page);
    await page.route('**/api/session', (route) => route.fulfill({ status: 401, json: { message: 'unauthenticated' } }));
    const login = new LoginPageObject(page);
    await login.goto();
    await page.evaluate(() => {
      navigator.credentials.get = () => new Promise(() => undefined);
    });
    const before = await login.passkeyButton.evaluate((element) => (element as HTMLElement).offsetWidth);

    await login.passkeyButton.click();

    await expect(login.passkeyButton).toHaveAttribute('aria-busy', 'true');
    await expect(login.passkeyButton.locator('.animate-cairn-spin')).toBeVisible();
    expect((await login.passkeyButton.boundingBox())!.width).toBe(before);
    const spin = await login.passkeyButton
      .locator('.animate-cairn-spin')
      .evaluate((element) => getComputedStyle(element).animationDuration);
    expect(spin).toBe('0.8s');
  });
});

test.describe('add a line motion', () => {
  test('fades Quantite and PRU in and focuses Quantite after a pick', async ({ page }) => {
    await mockApi(page);
    await page.goto('/holdings');
    await page.getByTestId('add-holding-desktop').click();
    await expect(page.getByTestId('holding-add-dialog').locator('dialog')).toBeVisible();
    await page.getByTestId('holding-add-query').fill('Amundi MSCI World');
    await recordAnimations(page);

    await page.getByTestId('holding-add-catalog-candidate').click();

    await expect(page.getByTestId('holding-add-quantity')).toBeFocused();
    expect(await started(page)).toContain('cairn-fade-in@DIV');
  });
});

test.describe('theme switch', () => {
  test('holds data-theme-switching around the change and releases it on the next frame', async ({ page }) => {
    await mockApi(page);
    await page.goto('/profile');
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { themeLog: string[] }).themeLog = log;
      new MutationObserver((records) => {
        for (const record of records) {
          const root = document.documentElement;
          log.push(`${record.attributeName}:${root.hasAttribute('data-theme-switching')}`);
        }
      }).observe(document.documentElement, { attributes: true });
    });

    await page.getByRole('radio', { name: 'Dark' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-switching');
    const log = await page.evaluate(() => (window as unknown as { themeLog: string[] }).themeLog);
    expect(log).toContain('data-theme:true');
  });
});

test.describe('busy dialog', () => {
  test('ignores Escape while a slow purchase is being saved', async ({ page }) => {
    await mockApi(page);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/api/holdings/*/buy', async (route) => {
      await gate;
      await route.fallback();
    });
    await page.goto(`/holdings/${AMUNDI_ID}`);
    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('holding-buy').click();
    await expect(page.getByTestId('holding-buy-dialog').locator('dialog')).toBeVisible();
    await page.getByTestId('holding-buy-quantity').fill('40');
    await page.getByTestId('holding-buy-price').fill('29,10');
    const submit = page.getByTestId('holding-buy-submit');
    const width = await submit.evaluate((element) => (element as HTMLElement).offsetWidth);

    await submit.click();
    await expect(submit).toHaveAttribute('aria-busy', 'true');
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('holding-buy-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByTestId('holding-buy-dialog').locator('dialog')).toHaveAttribute('aria-busy', 'true');
    expect(await submit.evaluate((element) => (element as HTMLElement).offsetWidth)).toBe(width);

    release();

    await expect(page.getByTestId('holding-buy-dialog')).toHaveCount(0);
  });
});

test.describe('skeleton rule', () => {
  test('shows no skeleton for a call under 150 ms', async ({ page }) => {
    await mockApi(page);
    await page.route('**/api/instruments', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fallback();
    });
    await page.goto('/instruments');
    await expect(page.getByTestId('add-instrument')).toBeVisible();
    await expect(page.getByTestId('instruments-count-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('instrument-row').first()).toBeVisible();
  });
});
