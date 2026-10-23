const SEGMENT = 'holdings';

export const HOLDINGS_PATHS = {
  segment: SEGMENT,
  list: `/${SEGMENT}`,
  detail: (id: string): string[] => [`/${SEGMENT}`, id],
} as const;

export const HOLDINGS_QUERY = { account: 'compte', assetClass: 'classe' } as const;
