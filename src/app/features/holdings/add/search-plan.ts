import type { SearchableSource } from '@core/api-client/cairnAPI.schemas';

import { compactIsin, isIsin } from './isin';

export type SourceFilter = 'ALL' | SearchableSource;

export const SOURCE_FILTERS: readonly SourceFilter[] = ['ALL', 'YAHOO', 'COINGECKO', 'AMUNDI'];

const SEARCHABLE_SOURCES: readonly SearchableSource[] = ['YAHOO', 'COINGECKO', 'AMUNDI'];

const MIN_QUERY_LENGTH = 2;

export type PlannedSource = { source: SearchableSource; query: string | null };

const askedByDefault = (source: SearchableSource, isin: boolean, employeeSavings: boolean): boolean =>
  source === 'YAHOO' ? !employeeSavings : source === 'COINGECKO' ? !isin : isin;

export const planSearch = (text: string, filter: SourceFilter): PlannedSource[] => {
  const trimmed = text.trim();

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const isin = isIsin(trimmed);
  const query = isin ? compactIsin(trimmed) : trimmed;

  if (filter !== 'ALL') {
    return [{ source: filter, query: filter === 'AMUNDI' && !isin ? null : query }];
  }

  const employeeSavings = isin && query.startsWith('QS');

  return SEARCHABLE_SOURCES.filter((source) => askedByDefault(source, isin, employeeSavings)).map((source) => ({
    source,
    query,
  }));
};

export const resultKey = (source: SearchableSource, query: string): string => `${source}|${query}`;
