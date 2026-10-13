import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { PortfolioPageObject } from './pages/portfolio-page';

test.describe('shell', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('masks every amount from the header eye, across screens and reloads', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();
    await expect(portfolio.totalValue).not.toHaveText(/••••/);
    await expect(portfolio.hideAmounts).toHaveAttribute('aria-pressed', 'false');

    await portfolio.hideAmounts.click();
    await expect(portfolio.hideAmounts).toHaveAttribute('aria-pressed', 'true');
    await expect(portfolio.totalValue).toHaveText(/••••/);

    await page.getByTestId('account-link').click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(portfolio.hideAmounts).toHaveAttribute('aria-pressed', 'true');

    await page
      .getByRole('link', { name: /^(Portfolio|Portefeuille)$/ })
      .first()
      .click();
    await expect(portfolio.totalValue).toHaveText(/••••/);

    await page.reload();
    await expect(portfolio.totalValue).toHaveText(/••••/);
    await expect(portfolio.hideAmounts).toHaveAttribute('aria-pressed', 'true');
  });
});
