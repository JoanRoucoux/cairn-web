import { render } from '@testing-library/angular';

import { HoldingListSkeleton } from './holding-list-skeleton';

describe('HoldingListSkeleton', () => {
  it('draws two cards of a header and four rows on the iPhone', async () => {
    const { container } = await render(HoldingListSkeleton);
    const cards = container.querySelectorAll('[data-testid="holdings-loading-cards"] > div');

    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.querySelectorAll(':scope > div')).toHaveLength(5);
    }
  });

  it('draws eight rows with the mockup name widths on desktop', async () => {
    const { container } = await render(HoldingListSkeleton);
    const names = [
      ...container.querySelectorAll<HTMLElement>(
        '[data-testid="holdings-loading-rows"] > div > div:first-child > ui-skeleton:first-child',
      ),
    ];

    expect(names.map((name) => name.style.width)).toEqual(
      [220, 180, 260, 200, 240, 170, 210, 190].map((width) => `${width}px`),
    );
  });
});
