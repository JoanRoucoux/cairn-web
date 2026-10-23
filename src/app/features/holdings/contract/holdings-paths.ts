export const HOLDINGS_SEGMENT = 'holdings';
export const HOLDINGS_PATH = `/${HOLDINGS_SEGMENT}`;
export const holdingPath = (id: string): string[] => [HOLDINGS_PATH, id];
export const HOLDINGS_QUERY = { account: 'compte', assetClass: 'classe' } as const;
