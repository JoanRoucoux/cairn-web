import { type Locator, type Page, expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

const AMUNDI_ID = '11111111-1111-1111-1111-111111111111';

type ExitRecord = { exitTransitions: number; closedAt: number | null; removedAt: number | null };
type RecordingWindow = Window & { exit: ExitRecord };

const sellDialog = (page: Page): Locator => page.getByTestId('holding-sell-dialog');

const openSell = async (page: Page, trigger: string): Promise<void> => {
  await page.getByTestId(trigger).click();
  await expect(sellDialog(page).locator('dialog')).toBeVisible();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="holding-sell-dialog"] dialog')?.getAnimations().length === 0,
  );
  await page.evaluate(() => {
    const host = document.querySelector('[data-testid="holding-sell-dialog"]')!;
    const dialog = host.querySelector('dialog')!;
    const record: ExitRecord = { exitTransitions: 0, closedAt: null, removedAt: null };

    (window as unknown as RecordingWindow).exit = record;
    dialog.addEventListener('close', () => (record.closedAt = performance.now()));
    dialog.addEventListener('transitionrun', (event) => {
      if (event.target === dialog && record.closedAt !== null) {
        record.exitTransitions += 1;
      }
    });
    new MutationObserver((_, observer) => {
      if (!host.isConnected) {
        record.removedAt = performance.now();
        observer.disconnect();
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
};

const countHoldingReloads = (page: Page): (() => number) => {
  let count = 0;

  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/holdings') {
      count += 1;
    }
  });

  return () => count;
};

const expectExitPlayed = async (page: Page): Promise<void> => {
  await expect(sellDialog(page)).toHaveCount(0);

  const { exitTransitions, closedAt, removedAt } = await page.evaluate(
    () => (window as unknown as RecordingWindow).exit,
  );

  expect(exitTransitions).toBeGreaterThan(0);
  expect(removedAt! - closedAt!).toBeGreaterThanOrEqual(150);
};

test.describe('sell dialog close paths on desktop', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto(`/holdings/${AMUNDI_ID}`);
    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible({ timeout: 15_000 });
    await openSell(page, 'holding-sell');
  });

  const expectDismissed = async (page: Page, reloads: () => number): Promise<void> => {
    await expectExitPlayed(page);
    await expect(page.getByTestId('holding-sell')).toBeFocused();
    expect(reloads()).toBe(0);
    await expect(page.getByRole('status').filter({ hasText: 'Sale saved' })).toHaveCount(0);
  };

  test('plays the exit on Escape, then hands focus back to Sell', async ({ page }) => {
    const reloads = countHoldingReloads(page);

    await page.keyboard.press('Escape');

    await expectDismissed(page, reloads);
  });

  test('plays the exit on a click on the backdrop', async ({ page }) => {
    const reloads = countHoldingReloads(page);

    await page.mouse.click(8, 8);

    await expectDismissed(page, reloads);
  });

  test('plays the exit on the close cross', async ({ page }) => {
    const reloads = countHoldingReloads(page);

    await sellDialog(page).getByRole('button', { name: 'Close' }).click();

    await expectDismissed(page, reloads);
  });

  test('plays the exit on Cancel', async ({ page }) => {
    const reloads = countHoldingReloads(page);

    await page.getByTestId('holding-sell-cancel').click();

    await expectDismissed(page, reloads);
  });

  test('plays the exit after a sale, reports it once, then confirms it', async ({ page }) => {
    const reloads = countHoldingReloads(page);

    await page.getByTestId('holding-sell-quantity').fill('100');
    await page.getByTestId('holding-sell-submit').click();

    await expectExitPlayed(page);
    await expect(page.getByRole('status')).toHaveText('Sale saved');
    await expect(page.getByTestId('holding-sell')).toBeFocused();
    await expect.poll(reloads).toBe(2);
    await page.waitForTimeout(300);
    expect(reloads()).toBe(2);
  });
});

test.describe('sell sheet on iPhone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('plays the exit when the sheet is dragged down, then hands focus back to Sell', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/holdings/${AMUNDI_ID}`);
    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible({ timeout: 15_000 });
    await openSell(page, 'holding-sell-bar');
    const reloads = countHoldingReloads(page);
    const handle = await sellDialog(page).locator('[data-dialog-handle]').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const x = handle!.x + handle!.width / 2;
    let y = handle!.y + handle!.height / 2;

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 0; step < 20; step += 1) {
      y += 20;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expectExitPlayed(page);
    await expect(page.getByTestId('holding-sell-bar')).toBeFocused();
    expect(reloads()).toBe(0);
  });
});
