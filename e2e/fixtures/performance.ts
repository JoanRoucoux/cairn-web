type Portfolio = { totalEur: number; dayChangeEur: number };
type Account = { type: string };

type PerformanceFixtures = {
  intradayHistory: { points: { at: string; totalEur: number }[] };
  performance: {
    range: string;
    from: string;
    to: string;
    reconstructed: boolean;
    lastPriceAt: string;
    total: { valueEur: number; changeEur: number; changeRatio: number };
    byEnvelope: { accountType: string; share: number; valueEur: number; changeEur: number; changeRatio: number }[];
  };
};

export const buildPerformanceFixtures = (portfolio: Portfolio, account: Account): PerformanceFixtures => {
  const total = { valueEur: portfolio.totalEur, changeEur: portfolio.dayChangeEur, changeRatio: 0.0025 };

  return {
    intradayHistory: { points: [{ at: '2026-08-27T18:00:00Z', totalEur: portfolio.totalEur }] },
    performance: {
      range: '1d',
      from: '2026-08-27',
      to: '2026-08-27',
      reconstructed: false,
      lastPriceAt: '2026-08-27T18:00:00Z',
      total,
      byEnvelope: [{ accountType: account.type, share: 1, ...total }],
    },
  };
};
