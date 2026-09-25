import type { PlottedPoint } from './chart-scale';

/** 3 to 5 evenly-spaced points from a series, always including the first and the last. */
export const axisTicks = <T extends PlottedPoint>(points: readonly T[], maxTicks = 5): T[] => {
  if (points.length <= maxTicks) {
    return [...points];
  }

  const count = Math.max(3, Math.min(maxTicks, points.length));
  const step = (points.length - 1) / (count - 1);

  const indexes = new Set<number>();

  for (let tick = 0; tick < count; tick++) {
    indexes.add(Math.round(tick * step));
  }

  return [...indexes].sort((a, b) => a - b).map((index) => points[index] as T);
};
