type Holding = {
  accountId: string;
  marketValueEur: number | null;
  dayChangeEur: number | null;
  unrealizedGainEur: number | null;
};
type Account = { id: string; name: string };

const sumBy = (holdings: Holding[], field: 'marketValueEur' | 'dayChangeEur' | 'unrealizedGainEur'): number =>
  holdings.reduce((sum, candidate) => sum + (candidate[field] ?? 0), 0);

/** `byAccount`, from the same `holdings`/`accounts` fixtures rather than duplicated numbers. */
export const summarizeByAccount = (
  holdings: Holding[],
  accounts: Account[],
  totalEur: number,
): { label: string; valueEur: number; share: number }[] =>
  accounts.map((account) => {
    const valueEur = sumBy(
      holdings.filter((holding) => holding.accountId === account.id),
      'marketValueEur',
    );

    return { label: account.name, valueEur, share: valueEur / totalEur };
  });

export const totalsOf = (
  holdings: Holding[],
): { totalEur: number; dayChangeEur: number; unrealizedGainEur: number } => ({
  totalEur: sumBy(holdings, 'marketValueEur'),
  dayChangeEur: sumBy(holdings, 'dayChangeEur'),
  unrealizedGainEur: sumBy(holdings, 'unrealizedGainEur'),
});
