import { buyPreview, sellPreview } from './trade-preview';

describe('buyPreview', () => {
  it('weighs the average cost by held and bought quantities', () => {
    const preview = buyPreview(500, 24.12, 40, 29.1);

    expect(preview.quantityAfter).toBe(540);
    expect(preview.averageCostAfter).toBeCloseTo((500 * 24.12 + 40 * 29.1) / 540);
    expect(preview.amount).toBeCloseTo(40 * 29.1);
  });

  it('takes the unit price as the average cost when none was known', () => {
    const preview = buyPreview(342, null, 20, 51.2);

    expect(preview.averageCostAfter).toBe(51.2);
  });
});

describe('sellPreview', () => {
  it('lowers the quantity and keeps the cost basis out of the computation', () => {
    const preview = sellPreview(500, 24.12, 28.6368, 100);

    expect(preview.quantityAfter).toBe(400);
    expect(preview.closesHolding).toBe(false);
    expect(preview.realizedGain).toBeCloseTo(100 * (28.6368 - 24.12));
    expect(preview.amount).toBeCloseTo(100 * 28.6368);
  });

  it('closes the holding when the whole quantity is sold', () => {
    const preview = sellPreview(500, 24.12, 28.6368, 500);

    expect(preview.quantityAfter).toBe(0);
    expect(preview.closesHolding).toBe(true);
  });

  it('has no realized gain without a known cost basis', () => {
    const preview = sellPreview(342, null, 51.76, 20);

    expect(preview.realizedGain).toBeNull();
    expect(preview.amount).toBeCloseTo(20 * 51.76);
  });

  it('has no realized gain and no amount without a current price', () => {
    const preview = sellPreview(10, 5, null, 3);

    expect(preview.realizedGain).toBeNull();
    expect(preview.amount).toBeNull();
  });
});
