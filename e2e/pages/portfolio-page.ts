import { type Locator, type Page } from '@playwright/test';

export class PortfolioPageObject {
  readonly staleBanner: Locator;
  readonly ranges: Locator;
  readonly heroValue: Locator;
  readonly tiles: Locator;
  readonly chart: Locator;
  readonly tooltip: Locator;

  constructor(private readonly page: Page) {
    this.staleBanner = page.getByTestId('stale-banner');
    this.ranges = page.getByRole('radio');
    this.heroValue = page.getByTestId('hero-value');
    this.tiles = page.getByRole('listitem');
    this.chart = page.getByRole('img', { name: /net worth|patrimoine/i });
    this.tooltip = page.getByTestId('chart-tooltip');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async pickRange(label: string): Promise<void> {
    await this.page.getByRole('radio', { name: label }).click();
  }
}
