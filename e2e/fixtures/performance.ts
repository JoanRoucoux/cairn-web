type Portfolio = { totalEur: number; dayChangeEur: number };
type Envelope = { accountType: string; valueEur: number; changeEur: number; changeRatio: number | null };

type PerformanceFixtures = {
  intradayHistory: { points: { at: string; totalEur: number }[] };
  performance: {
    range: string;
    from: string;
    to: string;
    reconstructed: boolean;
    lastPriceAt: string;
    total: { valueEur: number; changeEur: number; changeRatio: number };
    byEnvelope: {
      accountType: string;
      share: number;
      valueEur: number;
      changeEur: number;
      changeRatio: number | null;
    }[];
  };
};

// Park-Miller minimal standard LCG: deterministic (same seed -> same series every run), values in (0, 1).
const lcg = (seed: number): (() => number) => {
  let state = seed % 2147483647;

  return () => {
    state = (state * 16807) % 2147483647;

    return (state - 1) / 2147483646;
  };
};

/**
 * A trending series from `start` to `end` with a random walk added on top (a few flat stretches,
 * most steps around 0.03-0.05% of the value), pinned exactly to `start` and `end` regardless of
 * the walk: it is a Brownian bridge (the random part alone, `cumulative - linear`, is 0 at both
 * ends), added to the straight-line trend rather than replacing it.
 */
export const buildTrendSeries = (start: number, end: number, count: number, seed: number): number[] => {
  const random = lcg(seed);
  const stepScale = ((start + end) / 2) * 0.0004;
  const cumulative = [0];

  for (let index = 1; index < count; index++) {
    const flat = random() < 0.15;
    const step = flat ? 0 : (random() - 0.5) * 2 * stepScale;

    cumulative.push((cumulative[index - 1] as number) + step);
  }

  const drift = cumulative[count - 1] as number;

  return cumulative.map((value, index) => {
    const bridge = value - (index / (count - 1)) * drift;
    const trend = start + ((end - start) * index) / (count - 1);

    return trend + bridge;
  });
};

// 09:00 to 17:30 Paris time every 30 minutes (07:00-15:30 UTC in August's CEST offset).
const buildIntradayPoints = (openEur: number, closeEur: number): { at: string; totalEur: number }[] => {
  const series = buildTrendSeries(openEur, closeEur, 18, 20_260_827);

  return series.map((totalEur, index) => {
    const hour = 7 + Math.floor(index / 2);
    const minute = index % 2 === 0 ? '00' : '30';

    return {
      at: `2026-08-27T${String(hour).padStart(2, '0')}:${minute}:00Z`,
      totalEur,
    };
  });
};

export const buildPerformanceFixtures = (portfolio: Portfolio, envelopes: Envelope[]): PerformanceFixtures => {
  const total = {
    valueEur: portfolio.totalEur,
    changeEur: portfolio.dayChangeEur,
    changeRatio: portfolio.dayChangeEur / (portfolio.totalEur - portfolio.dayChangeEur),
  };
  const previousClose = portfolio.totalEur - portfolio.dayChangeEur;
  const points = buildIntradayPoints(previousClose, portfolio.totalEur);
  const lastPriceAt = (points.at(-1) as { at: string }).at;

  return {
    intradayHistory: { points },
    performance: {
      range: '1d',
      from: '2026-08-27',
      to: '2026-08-27',
      reconstructed: false,
      lastPriceAt,
      total,
      byEnvelope: [...envelopes]
        .sort((a, b) => b.valueEur - a.valueEur)
        .map((envelope) => ({ ...envelope, share: envelope.valueEur / portfolio.totalEur })),
    },
  };
};
