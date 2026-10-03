type Row = {
  label: string;
  valueEur: number;
  share: number;
};

type Portfolio = {
  totalEur: number;
  unvaluedCount: number;
  nonEurCount: number;
  byAssetClass: Row[];
  byAccount: Row[];
};

type Account = {
  id: string;
  name: string;
};

type Holding = {
  assetClass: string;
  accountId: string;
};

export const buildAllocationFixtures = (
  portfolio: Portfolio,
  holdings: Holding[],
  accounts: Account[],
): Record<string, unknown> => ({
  'GET /api/portfolio/allocation/classes': {
    totalEur: portfolio.totalEur,
    unvaluedCount: portfolio.unvaluedCount,
    nonEurCount: portfolio.nonEurCount,
    items: portfolio.byAssetClass.map((row) => ({
      assetClass: row.label,
      valueEur: row.valueEur,
      share: row.share,
      lineCount: holdings.filter((candidate) => candidate.assetClass === row.label).length,
    })),
  },
  'GET /api/portfolio/allocation/accounts': {
    totalEur: portfolio.totalEur,
    unvaluedCount: portfolio.unvaluedCount,
    nonEurCount: portfolio.nonEurCount,
    items: portfolio.byAccount.map((row) => {
      const account = accounts.find((candidate) => candidate.name === row.label);

      return {
        account,
        valueEur: row.valueEur,
        share: row.share,
        lineCount: holdings.filter((candidate) => candidate.accountId === account?.id).length,
      };
    }),
  },
});
