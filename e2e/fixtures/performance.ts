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

// 09:00 to 17:30 every 30 minutes, a small wobble around the day's trend, exactly on `totalEur` at close.
const buildIntradayPoints = (openEur: number, closeEur: number): { at: string; totalEur: number }[] => {
  const wobble = [0, 0.3, -0.2, 0.5, 0.1, -0.4, 0.6, 0.2, -0.1, 0.4, 0.7, 0.3, -0.3, 0.5, 0.8, 0.4, -0.2, 0.6];
  const step = (closeEur - openEur) / wobble.length;

  return wobble.map((offset, index) => {
    const hour = 9 + Math.floor(index / 2);
    const minute = index % 2 === 0 ? '00' : '30';

    return {
      at: `2026-08-27T${String(hour).padStart(2, '0')}:${minute}:00Z`,
      totalEur: openEur + step * index + offset,
    };
  });
};

export const buildPerformanceFixtures = (portfolio: Portfolio, account: Account): PerformanceFixtures => {
  const total = { valueEur: portfolio.totalEur, changeEur: portfolio.dayChangeEur, changeRatio: 0.0025 };
  const previousClose = portfolio.totalEur - portfolio.dayChangeEur;
  const points = [
    ...buildIntradayPoints(previousClose, portfolio.totalEur),
    { at: '2026-08-27T18:00:00Z', totalEur: portfolio.totalEur },
  ];

  return {
    intradayHistory: { points },
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
