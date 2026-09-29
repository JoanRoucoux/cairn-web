import { type Locator, type Page } from '@playwright/test';

export class AllocationPageObject {
  readonly donuts: Locator;
  readonly legendRows: Locator;

  constructor(private readonly page: Page) {
    this.donuts = page.locator('svg[role="img"]');
    this.legendRows = page.getByRole('button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/allocation');
  }
}
