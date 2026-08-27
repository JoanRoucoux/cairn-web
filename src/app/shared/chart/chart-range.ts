export const CHART_RANGES = ['1d', '7d', '1m', '1y', '5y', 'max'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

const RANGE_DAYS: Record<ChartRange, number | null> = {
  '1d': 1,
  '7d': 7,
  '1m': 31,
  '1y': 366,
  '5y': 1827,
  max: null,
};

/** Start of the window for a range, or undefined for the whole available history. */
export const rangeStart = (range: ChartRange, now: Date = new Date()): string | undefined => {
  const days = RANGE_DAYS[range];

  if (days === null) {
    return undefined;
  }

  return new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
};
