import { expect, test } from './fixtures/accessibility';
import { mockApi } from './fixtures/api';

const screens = [
  '/',
  '/holdings',
  '/holdings/11111111-1111-1111-1111-111111111111',
  '/allocation',
  '/profile',
  '/accounts',
];

for (const screen of screens) {
  test(`has no accessibility violation on ${screen}`, async ({ page, makeAxeBuilder }) => {
    await mockApi(page);
    await page.goto(screen);
    // Scanning before the lazy i18n scope resolves makes axe flag transient empty aria-labels.
    await page.waitForLoadState('networkidle');

    const results = await makeAxeBuilder().analyze();

    expect(results.violations).toEqual([]);
  });
}

test('has no accessibility violation on an unknown url', async ({ page, makeAxeBuilder }) => {
  await mockApi(page);
  await page.goto('/nowhere');
  await page.waitForLoadState('networkidle');

  const results = await makeAxeBuilder().analyze();

  expect(results.violations).toEqual([]);
});

test('has no accessibility violation on /login, passkey mode', async ({ page, makeAxeBuilder }) => {
  await mockApi(page);
  await page.route('**/api/session', (route) => route.fulfill({ status: 401, json: { message: 'unauthenticated' } }));
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const results = await makeAxeBuilder().analyze();

  expect(results.violations).toEqual([]);
});

test('has no accessibility violation on /login, password mode', async ({ page, makeAxeBuilder }) => {
  await mockApi(page);
  await page.route('**/api/session', (route) => route.fulfill({ status: 401, json: { message: 'unauthenticated' } }));
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByTestId('login-password-toggle').click();

  const results = await makeAxeBuilder().analyze();

  expect(results.violations).toEqual([]);
});

test('has no accessibility violation on /profile with the add-passkey dialog open', async ({
  page,
  makeAxeBuilder,
}) => {
  await mockApi(page);
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
  await page.getByTestId('manage-passkeys').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));

  const results = await makeAxeBuilder().analyze();

  expect(results.violations).toEqual([]);
});
