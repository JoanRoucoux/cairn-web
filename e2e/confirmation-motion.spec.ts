import { type Locator, type Page, expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

const AMUNDI_ID = '11111111-1111-1111-1111-111111111111';

type Motion = {
  kind: 'css' | 'waapi';
  name: string;
  from: string;
  tag: string;
  testId: string;
  text: string;
  at: number;
};
type MotionWindow = Window & { motion: Motion[] };

const recordMotion = (page: Page): Promise<void> =>
  page.addInitScript(() => {
    const log: Motion[] = [];
    const describe = (element: Element): Pick<Motion, 'tag' | 'testId' | 'text'> => ({
      tag: element.tagName,
      testId: element.closest('[data-testid]')?.getAttribute('data-testid') ?? '',
      text: (element.closest('tr, li, a, button') ?? element).textContent?.replace(/\s+/g, ' ').trim() ?? '',
    });
    const animate = Element.prototype.animate;

    (window as unknown as MotionWindow).motion = log;
    document.addEventListener(
      'animationstart',
      (event) =>
        log.push({
          kind: 'css',
          name: event.animationName,
          from: '',
          at: performance.now(),
          ...describe(event.target as Element),
        }),
      true,
    );
    Element.prototype.animate = function (this: Element, keyframes, options) {
      const first = (Array.isArray(keyframes) ? keyframes[0] : keyframes) ?? {};
      const name = Object.keys(first).find((key) => key !== 'offset' && key !== 'easing') ?? '';

      log.push({
        kind: 'waapi',
        name,
        from: String(first[name as keyof typeof first]),
        at: performance.now(),
        ...describe(this),
      });

      return animate.call(this, keyframes, options);
    };
  });

const motion = (page: Page): Promise<Motion[]> => page.evaluate(() => (window as unknown as MotionWindow).motion);

const clearMotion = (page: Page): Promise<void> =>
  page.evaluate(() => (window as unknown as MotionWindow).motion.splice(0));

const toast = (page: Page): Locator => page.locator('ui-toaster > div');

const box = async (locator: Locator): Promise<{ top: number; bottom: number; left: number; right: number }> => {
  await expect.poll(() => locator.evaluate((element) => element.getAnimations().length)).toBe(0);
  const rect = (await locator.boundingBox())!;

  return { top: rect.y, bottom: rect.y + rect.height, left: rect.x, right: rect.x + rect.width };
};

test.describe('after a change on desktop', () => {
  const row = (page: Page, holdingId: string): Locator =>
    page.locator('tr').filter({ has: page.locator(`[data-holding-id="${holdingId}"]`) });

  test.beforeEach(async ({ page }) => {
    await recordMotion(page);
    await mockApi(page);
    await page.goto(`/holdings/${AMUNDI_ID}`);
    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible({ timeout: 15_000 });
    await expect(row(page, AMUNDI_ID)).toContainText('83,277.60');
  });

  test('closes the purchase, confirms it at the bottom of the content area, then highlights the line', async ({
    page,
  }) => {
    await page.getByTestId('holding-buy').click();
    await page.getByTestId('holding-buy-quantity').fill('10');
    await page.getByTestId('holding-buy-price').fill('400');
    await clearMotion(page);
    await page.getByTestId('holding-buy-submit').click();

    await expect(page.getByTestId('holding-buy-dialog')).toHaveCount(0);
    await expect(toast(page)).toHaveText('Purchase saved');
    await expect(row(page, AMUNDI_ID)).toContainText('87,372.60');
    await expect
      .poll(async () =>
        (await motion(page)).filter((entry) => entry.name === 'backgroundColor').map((entry) => entry.tag),
      )
      .toContain('TD');
    const highlighted = (await motion(page)).filter((entry) => entry.name === 'backgroundColor' && entry.tag === 'TD');
    expect(highlighted.every((entry) => entry.text.includes('Amundi MSCI World'))).toBe(true);

    const viewport = page.viewportSize()!;
    const sidebar = await box(page.locator('aside').filter({ has: page.getByRole('navigation') }));
    const placed = await box(toast(page));
    expect((placed.left + placed.right) / 2).toBeCloseTo((sidebar.right + viewport.width) / 2, 0);
    expect(Math.round(viewport.height - placed.bottom)).toBe(24);
  });

  test('fades the sold-out line, slides the next ones up, then confirms the sale', async ({ page }) => {
    await page.getByTestId('holding-sell').click();
    await page.getByTestId('holding-sell-all').click();
    await clearMotion(page);
    await page.getByTestId('holding-sell-submit').click();

    await expect(row(page, AMUNDI_ID)).toHaveCount(0);
    await expect(toast(page)).toHaveText('Holding deleted');
    const entries = await motion(page);
    const fade = entries.find((entry) => entry.name === 'cairn-fade-out' && entry.text.includes('Amundi MSCI World'));
    const slides = entries.filter((entry) => entry.name === 'transform' && entry.tag === 'TR');

    expect(fade).toBeDefined();
    expect(slides.length).toBeGreaterThan(0);
    expect(slides.every((slide) => slide.at >= fade!.at)).toBe(true);
    expect(slides.some((slide) => slide.text.includes('Bitcoin'))).toBe(true);
    expect(slides.map((slide) => slide.from)).toEqual(slides.map(() => 'translateY(60px)'));
  });

  test('keeps a purchase and confirms it when the detail closes while the dialog is still leaving', async ({
    page,
  }) => {
    await page.getByTestId('holding-buy').click();
    await page.getByTestId('holding-buy-quantity').fill('10');
    await page.getByTestId('holding-buy-price').fill('400');
    const saved = page.waitForResponse((response) => response.url().endsWith('/buy'));
    await page.getByTestId('holding-buy-submit').click();
    await saved;
    await page.keyboard.press('Escape');

    await expect(page).toHaveURL(/\/holdings$/);
    await expect(toast(page)).toHaveText('Purchase saved');
    await expect(row(page, AMUNDI_ID)).toContainText('87,372.60');
  });

  test('filters the list on each keystroke with no animation', async ({ page }) => {
    await page.goto('/holdings');
    await expect(row(page, AMUNDI_ID)).toBeVisible();
    await clearMotion(page);

    await page.getByTestId('holdings-search').pressSequentially('amun');
    await expect(row(page, '22222222-2222-2222-2222-222222222222')).toHaveCount(0);
    await page.getByTestId('holdings-search').fill('');
    await expect(row(page, '22222222-2222-2222-2222-222222222222')).toBeVisible();

    const moved = (await motion(page)).filter((entry) => ['transform', 'cairn-fade-out'].includes(entry.name));
    expect(moved).toEqual([]);
  });
});

test.describe('after a change on iPhone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    await recordMotion(page);
    await mockApi(page);
  });

  test('confirms a new balance 8 px above the tab bar and highlights the cash line', async ({ page }) => {
    await page.goto('/holdings');
    const northwind = page.getByTestId('account-card').filter({ hasText: 'Northwind PEA' });
    await northwind.getByTestId('edit-cash-mobile').click();
    await page.getByTestId('holding-cash-amount').fill('900');
    await clearMotion(page);
    await page.getByTestId('holding-cash-submit').click();

    await expect(toast(page)).toHaveText('Balance updated');
    await expect(northwind.getByTestId('edit-cash-mobile')).toContainText('900');
    await expect
      .poll(async () =>
        (await motion(page)).filter((entry) => entry.name === 'backgroundColor').map((entry) => entry.tag),
      )
      .toContain('BUTTON');

    const tabBar = await box(page.locator('nav[ui-tab-bar]'));
    const placed = await box(toast(page));
    expect(Math.round(tabBar.top - placed.bottom)).toBe(8);
  });

  test('confirms a purchase 8 px above the action bar of the line', async ({ page }) => {
    await page.goto(`/holdings/${AMUNDI_ID}`);
    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('holding-buy-bar').click();
    await page.getByTestId('holding-buy-quantity').fill('10');
    await page.getByTestId('holding-buy-price').fill('400');
    await page.getByTestId('holding-buy-submit').click();

    await expect(toast(page)).toHaveText('Purchase saved');
    const actionBar = await box(page.locator('ui-action-bar'));
    const placed = await box(toast(page));
    expect(Math.round(actionBar.top - placed.bottom)).toBe(8);
  });
});

test.describe('after a change on the profile', () => {
  test.beforeEach(async ({ page }) => {
    await recordMotion(page);
    await mockApi(page);
  });

  test('fades the new passkey in, highlights it, then fades a deleted one out and closes the gap', async ({ page }) => {
    const passkeys = [
      {
        credentialId: 'aXBob25l',
        label: "iPhone d'Alex",
        createdAt: '2026-02-01T10:00:00Z',
        lastUsedAt: null,
        current: true,
      },
      {
        credentialId: 'bWFj',
        label: 'MacBook Air',
        createdAt: '2026-03-12T10:05:00Z',
        lastUsedAt: null,
        current: false,
      },
    ];
    await page.route('**/api/session/passkeys', (route) => route.fulfill({ json: passkeys }));
    await page.route('**/api/session/passkeys/*', (route) => {
      passkeys.splice(
        passkeys.findIndex((passkey) => route.request().url().endsWith(passkey.credentialId)),
        1,
      );

      return route.fulfill({ status: 204 });
    });
    await page.route('**/webauthn/register', (route) => {
      passkeys.push({
        credentialId: 'aVBhZA',
        label: "iPad d'Alex",
        createdAt: '2026-10-02T10:00:00Z',
        lastUsedAt: null,
        current: false,
      });

      return route.fulfill({ json: { success: true } });
    });
    await page.addInitScript(() => {
      const created = { id: 'aVBhZA', toJSON: () => ({ id: 'aVBhZA', response: {} }) };

      navigator.credentials.create = (() => Promise.resolve(created)) as typeof navigator.credentials.create;
    });

    await page.goto('/profile');
    await expect(page.getByText('MacBook Air')).toBeVisible();
    await page.getByTestId('manage-passkeys').click();
    await page.getByTestId('passkey-label').fill("iPad d'Alex");
    await clearMotion(page);
    await page.getByTestId('passkey-register').click();

    await expect(toast(page)).toHaveText('Passkey added');
    await expect(page.getByTestId('added-passkey')).toContainText("iPad d'Alex");
    await expect
      .poll(async () =>
        (await motion(page)).filter((entry) => entry.testId === 'added-passkey').map((entry) => entry.name),
      )
      .toEqual(expect.arrayContaining(['cairn-fade-in', 'backgroundColor']));

    await clearMotion(page);
    await page.getByRole('button', { name: 'Delete the MacBook Air key' }).click();
    await page.getByTestId('passkey-delete-confirm').click();

    await expect(page.getByText('MacBook Air')).toHaveCount(0);
    await expect(toast(page)).toHaveText('Passkey deleted');
    const entries = await motion(page);
    expect(entries.some((entry) => entry.name === 'cairn-fade-out' && entry.text.includes('MacBook Air'))).toBe(true);
    expect(entries.some((entry) => entry.name === 'transform' && entry.text.includes("iPad d'Alex"))).toBe(true);
  });

  test('confirms an import with the number of holdings it brought in', async ({ page }) => {
    await page.route('**/api/portfolio/import', (route) =>
      route.fulfill({ json: { accountsCreated: 1, instrumentsCreated: 2, holdingsCreated: 3, holdingsUpdated: 4 } }),
    );
    await page.goto('/profile');

    await page.getByTestId('import-file').setInputFiles({
      name: 'portfolio.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('account;accountType;institution;instrument;isinOrTicker;quantity;averageCost\n'),
    });

    await expect(toast(page)).toHaveText('7 holdings imported');
    await expect(page.getByTestId('import-report')).toHaveCount(0);
  });

  test('reports a failed import in an error toast that stays until its cross is clicked', async ({ page }) => {
    await page.route('**/api/portfolio/import', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/problem+json',
        json: { status: 400, detail: 'Missing column quantity' },
      }),
    );
    await page.goto('/profile');

    await page.getByTestId('import-file').setInputFiles({
      name: 'portfolio.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('account;accountType\n'),
    });

    await expect(toast(page)).toHaveText('Import failed');
    await expect(page.getByTestId('import-rejections')).toHaveCount(0);

    await page.getByRole('status').getByRole('button', { name: 'Close' }).click();

    await expect(toast(page)).toHaveCount(0);
  });
});
