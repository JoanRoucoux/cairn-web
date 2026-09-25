import { axisTicks } from './chart-axis';
import type { PlottedPoint } from './chart-scale';

const pointAt = (t: number): PlottedPoint => ({ t, v: t, x: t, y: t });

describe('axisTicks', () => {
  it('should return every point when there are 5 or fewer', () => {
    const points = [0, 1, 2].map(pointAt);

    expect(axisTicks(points)).toEqual(points);
  });

  it('should pick 5 evenly-spaced points, including the first and the last, from a longer series', () => {
    const points = Array.from({ length: 20 }, (_, index) => pointAt(index));

    const ticks = axisTicks(points);

    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toEqual(points[0]);
    expect(ticks.at(-1)).toEqual(points[19]);
  });

  it('should cap the tick count with maxTicks', () => {
    const points = Array.from({ length: 20 }, (_, index) => pointAt(index));

    expect(axisTicks(points, 3)).toHaveLength(3);
  });
});
