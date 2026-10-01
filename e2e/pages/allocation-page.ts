import { type Locator, type Page, expect } from '@playwright/test';

export class AllocationPageObject {
  readonly donuts: Locator;

  constructor(private readonly page: Page) {
    this.donuts = page.locator('svg[role="img"]');
  }

  async goto(rings = 2): Promise<void> {
    await this.page.goto('/allocation');
    await expect(this.donuts).toHaveCount(rings);
  }
}
