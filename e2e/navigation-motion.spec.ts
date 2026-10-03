import { type Page, expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { LoginPageObject } from './pages/login-page';
import { ProfilePageObject } from './pages/profile-page';

const SECOND_ACCOUNT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab';
const FIRST_HOLDING = '11111111-1111-1111-1111-111111111111';

type TransitionRecord = { skipped: boolean };
type SpiedWindow = Window & { transitions: TransitionRecord[] };

const spyViewTransitions = (page: Page): Promise<void> =>
  page.addInitScript(() => {
    const spied = window as unknown as SpiedWindow;
    const start = document.startViewTransition.bind(document);

    spied.transitions = [];
    document.startViewTransition = ((callback) => {
      const transition = start(callback);
      const record = { skipped: false };
      const skip = transition.skipTransition.bind(transition);

      transition.skipTransition = () => {
        record.skipped = true;
        skip();
      };
      spied.transitions.push(record);

      return transition;
    }) as typeof document.startViewTransition;
  });

const transitions = (page: Page): Promise<TransitionRecord[]> =>
  page.evaluate(() => (window as unknown as SpiedWindow).transitions);

const playedTransitions = async (page: Page): Promise<number> =>
  (await transitions(page)).filter((record) => !record.skipped).length;

test.describe('navigation motion', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await spyViewTransitions(page);
  });

  test('swaps shell destinations and filters with no view transition', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /^(Lignes|Holdings)$/ }).click();
    await expect(page).toHaveURL(/\/holdings$/);
    await page.getByRole('link', { name: /^(Répartition|Allocation)$/ }).click();
    await expect(page).toHaveURL(/\/allocation$/);
    await page.getByRole('link', { name: /^(Comptes|Accounts)$/ }).click();
    await expect(page).toHaveURL(/\/accounts$/);
    await page.goto('/holdings');
    await page
      .getByRole('group', { name: /classe|class/i })
      .getByRole('button', { name: /^ETF/ })
      .click();
    await expect(page).toHaveURL(/classe=etf/);

    expect((await transitions(page)).length).toBeGreaterThan(0);
    expect(await playedTransitions(page)).toBe(0);
  });

  for (const path of ['/profile', '/instruments', `/holdings/${FIRST_HOLDING}`, '/nowhere']) {
    test(`starts no view transition on a direct load of ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      expect(await playedTransitions(page)).toBe(0);
    });
  }

  test.describe('on an iPhone viewport', () => {
    test.use({ viewport: { width: 390, height: 500 }, hasTouch: true });

    test('cross-fades the list into a line and back to the position it was left at', async ({ page }) => {
      await page.goto('/holdings');
      await expect(page.getByTestId('holding-row-mobile').first()).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 160));
      const leftAt = await page.evaluate(() => window.scrollY);

      expect(leftAt).toBeGreaterThan(0);

      await page.getByTestId('holding-row-mobile').first().click();
      await expect(page).toHaveURL(new RegExp(`/holdings/${FIRST_HOLDING}$`));
      await expect(page.getByTestId('holding-detail-back')).toBeVisible();
      expect(await playedTransitions(page)).toBe(1);

      await page.getByTestId('holding-detail-back').click();
      await expect(page).toHaveURL(/\/holdings$/);
      await expect(page.getByTestId('holding-row-mobile').first()).toBeVisible();

      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(leftAt);
    });

    test('lands on the group of ?compte= at once and highlights its header', async ({ page }) => {
      await page.goto(`/holdings?compte=${SECOND_ACCOUNT}`);

      const header = page.locator(`[data-account-id="${SECOND_ACCOUNT}"]`).locator('header');
      await expect(header).toBeVisible();
      await expect
        .poll(() => header.evaluate((element) => element.getAnimations().length), { intervals: [10] })
        .toBeGreaterThan(0);

      const top = await header.evaluate((element) => element.getBoundingClientRect().top);

      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThan(60);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    });
  });

  test('slides the detail panel in and out beside the list on desktop, without a view transition', async ({ page }) => {
    await page.goto('/holdings');
    await page.locator('table [data-holding-id]').first().click();

    const panel = page.locator('main aside app-holding-detail-page');

    await expect(panel).toBeVisible();
    await expect(panel).toHaveClass(/ui-enter-panel/);

    await page.getByRole('link', { name: /Fermer|Close/ }).click();

    await expect(panel).toHaveClass(/ui-leave-fade/);
    await expect(panel.getByRole('heading')).toBeVisible();
    await expect(panel).toHaveCount(0);
    expect(await playedTransitions(page)).toBe(0);
  });

  test('lands on the group of ?compte= at once on desktop and highlights its band', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 400 });
    await page.goto(`/holdings?compte=${SECOND_ACCOUNT}`);

    const cell = page.locator(`tbody[data-account-id="${SECOND_ACCOUNT}"] td[ui-group-cell]`);
    await expect(cell).toBeVisible();
    await expect
      .poll(() => cell.evaluate((element) => element.firstElementChild!.getAnimations().length), { intervals: [10] })
      .toBeGreaterThan(0);

    const top = await cell.evaluate((element) => element.getBoundingClientRect().top);

    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(80);
  });

  test('keeps the class filter active on arrival without highlighting a group', async ({ page }) => {
    await page.goto('/holdings?classe=etf');

    await expect(
      page.getByRole('group', { name: /classe|class/i }).getByRole('button', { name: /^ETF/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('account-group').first()).toBeVisible();

    const highlighted = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => (animation.effect as KeyframeEffect | null)?.target?.closest('[data-account-id]'))
          .length,
    );

    expect(highlighted).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test.describe('across full page loads', () => {
    const recordSwap = (page: Page): Promise<void> =>
      page.addInitScript(() => {
        window.addEventListener('pageswap', (event) => {
          const { viewTransition } = event as Event & { viewTransition: unknown };

          sessionStorage.setItem('swap', String(viewTransition !== null));
        });
      });

    test('cross-fades from the sign-in page to the portfolio', async ({ page }) => {
      let signedIn = false;
      await page.route('**/api/session', (route) =>
        signedIn ? route.fallback() : route.fulfill({ status: 401, json: { message: 'unauthenticated' } }),
      );
      await page.route('**/api/authenticate', (route) => {
        signedIn = true;

        return route.fulfill({ status: 204 });
      });
      await recordSwap(page);
      const login = new LoginPageObject(page);
      await login.goto();

      await login.signInWithPassword('alex', 'a-real-password');

      await expect(page).toHaveURL('/');
      expect(await page.evaluate(() => sessionStorage.getItem('swap'))).toBe('true');
    });

    test('cross-fades from the profile screen to the sign-in page on sign-out', async ({ page }) => {
      let signedOut = false;
      await page.route('**/api/session', (route) =>
        signedOut ? route.fulfill({ status: 401, json: { message: 'unauthenticated' } }) : route.fallback(),
      );
      await page.route('**/logout', (route) => {
        signedOut = true;

        return route.fulfill({ status: 200 });
      });
      await recordSwap(page);
      const profile = new ProfilePageObject(page);
      await profile.goto();

      await profile.signOut.click();

      await expect(page).toHaveURL('/login');
      expect(await page.evaluate(() => sessionStorage.getItem('swap'))).toBe('true');
    });
  });
});
