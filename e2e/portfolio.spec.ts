import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './fixtures/accessibility';

test('displays the portfolio page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cairn');
  await expectNoAccessibilityViolations(page);
});
