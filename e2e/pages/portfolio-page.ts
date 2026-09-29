import { type Locator, type Page } from '@playwright/test';

export class PortfolioPageObject {
  readonly staleLink: Locator;
  readonly ranges: Locator;
  readonly totalValue: Locator;
  readonly envelopeRows: Locator;
  readonly chart: Locator;
  readonly tooltip: Locator;
  readonly moversList: Locator;
  readonly moversTable: Locator;

  constructor(private readonly page: Page) {
    this.staleLink = page.getByTestId('stale-link');
    this.ranges = page.getByRole('radio');
    this.totalValue = page.getByTestId('total-value');
    this.envelopeRows = page.getByRole('listitem');
    this.chart = page.getByRole('img', { name: /net worth|patrimoine/i });
    this.tooltip = page.getByTestId('chart-tooltip');
    this.moversList = page.getByTestId('movers-list');
    this.moversTable = page.getByTestId('movers-table');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async pickRange(label: string): Promise<void> {
    await this.page.getByRole('radio', { name: label }).click();
  }
}
