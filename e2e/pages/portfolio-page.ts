import { type Locator, type Page } from '@playwright/test';

export class PortfolioPageObject {
  readonly staleBanner: Locator;
  readonly ranges: Locator;

  constructor(private readonly page: Page) {
    this.staleBanner = page.getByTestId('stale-banner');
    this.ranges = page.getByRole('radio');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async pickRange(label: string): Promise<void> {
    await this.page.getByRole('radio', { name: label }).click();
  }
}
