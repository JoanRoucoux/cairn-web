const SEGMENT = 'holdings';

export const HOLDINGS_PATHS = {
  segment: SEGMENT,
  list: `/${SEGMENT}`,
  detail: (id: string): string[] => [`/${SEGMENT}`, id],
} as const;

export const HOLDINGS_QUERY = { account: 'compte', assetClass: 'classe', add: 'add' } as const;

type HoldingsQueryKey = keyof typeof HOLDINGS_QUERY;

export const holdingsQuery = <V extends string | null>(
  params: Partial<Record<HoldingsQueryKey, V>>,
): Record<string, V> =>
  Object.fromEntries(Object.entries(params).map(([key, value]) => [HOLDINGS_QUERY[key as HoldingsQueryKey], value]));

export const holdingsListHref = (params: Partial<Record<HoldingsQueryKey, string>>): string =>
  `${HOLDINGS_PATHS.list}?${Object.entries(holdingsQuery(params))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')}`;
