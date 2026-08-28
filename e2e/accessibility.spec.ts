import { expect, test } from './fixtures/accessibility';
import { mockApi } from './fixtures/api';

const screens = ['/', '/positions', '/repartition', '/sources', '/profil', '/comptes', '/instruments'];

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
