import { expect, test } from './fixtures/accessibility';
import { mockApi } from './fixtures/api';

const screens = [
  '/',
  '/holdings',
  '/holdings/11111111-1111-1111-1111-111111111111',
  '/allocation',
  '/sources',
  '/profile',
  '/accounts',
  '/instruments',
];

for (const screen of screens) {
  test(`has no accessibility violation on ${screen}`, async ({ page, makeAxeBuilder }) => {
    await mockApi(page);
    await page.goto(screen);
    // Let the lazy i18n scope and session resolve before scanning, or axe catches
    // transient empty aria-labels that never reach the user.
    await page.waitForLoadState('networkidle');

    const results = await makeAxeBuilder().analyze();

    expect(results.violations).toEqual([]);
  });
}

test('has no accessibility violation on /login, folded', async ({ page, makeAxeBuilder }) => {
  await mockApi(page);
  await page.route('**/api/session', (route) => route.fulfill({ status: 401, json: { message: 'unauthenticated' } }));
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const results = await makeAxeBuilder().analyze();

  expect(results.violations).toEqual([]);
});

test('has no accessibility violation on /login, unfolded', async ({ page, makeAxeBuilder }) => {
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

  const results = await makeAxeBuilder().analyze();

  expect(results.violations).toEqual([]);
});
