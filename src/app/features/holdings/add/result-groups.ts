import type { HoldingResponse, InstrumentCandidateResponse, SearchableSource } from '@core/api-client/cairnAPI.schemas';

import { normalizeSearch } from '@shared/format/normalize-search';

import { compactIsin, isIsin } from './isin';
import { type PlannedSource, type SourceFilter, resultKey } from './search-plan';

export type SourceResult = { state: 'loading' | 'error' | 'ready'; candidates: InstrumentCandidateResponse[] };

export type ResultGroup = {
  source: SearchableSource;
  state: 'loading' | 'error' | 'ready' | 'short';
  candidates: InstrumentCandidateResponse[];
};

export const isForeign = (candidate: InstrumentCandidateResponse): boolean =>
  !!candidate.currency && candidate.currency !== 'EUR';

export const trackedTitlesOf = (holdings: HoldingResponse[]): HoldingResponse[] => {
  const titles = new Map<string, HoldingResponse>();

  for (const holding of holdings) {
    if (!holding.accountCash && holding.assetClass !== 'CASH' && !titles.has(holding.instrumentId)) {
      titles.set(holding.instrumentId, holding);
    }
  }

  return [...titles.values()];
};

const groupOf = (
  { source, query }: PlannedSource,
  results: ReadonlyMap<string, SourceResult>,
  trackedIds: ReadonlySet<string>,
): ResultGroup => {
  if (query === null) {
    return { source, state: 'short', candidates: [] };
  }

  const result = results.get(resultKey(source, query));

  if (result?.state !== 'ready') {
    return { source, state: result?.state ?? 'loading', candidates: [] };
  }

  const shown = result.candidates.filter(
    (candidate) => !candidate.trackedInstrumentId || !trackedIds.has(candidate.trackedInstrumentId),
  );

  return {
    source,
    state: 'ready',
    candidates: [...shown.filter((candidate) => !isForeign(candidate)), ...shown.filter(isForeign)],
  };
};

const rankOf = (group: ResultGroup): number =>
  group.candidates.some((candidate) => !isForeign(candidate)) ? 0 : group.state === 'ready' ? 2 : 1;

export const groupsFor = (
  plan: PlannedSource[],
  results: ReadonlyMap<string, SourceResult>,
  trackedIds: ReadonlySet<string>,
  filter: SourceFilter,
): ResultGroup[] => {
  const groups = plan.map((planned) => groupOf(planned, results, trackedIds));

  if (filter !== 'ALL') {
    return groups;
  }

  return groups
    .filter((group) => group.state !== 'ready' || group.candidates.length > 0)
    .sort((left, right) => rankOf(left) - rankOf(right));
};

export const trackedIdsFound = (
  plan: PlannedSource[],
  results: ReadonlyMap<string, SourceResult>,
): ReadonlySet<string> =>
  new Set(
    plan.flatMap(({ source, query }) =>
      (query === null ? [] : (results.get(resultKey(source, query))?.candidates ?? [])).flatMap(
        (candidate) => candidate.trackedInstrumentId ?? [],
      ),
    ),
  );

export const trackedMatches = (
  titles: HoldingResponse[],
  text: string,
  filter: SourceFilter,
  foundIds: ReadonlySet<string>,
): HoldingResponse[] => {
  const needle = normalizeSearch(text.trim());
  const isin = isIsin(text) ? compactIsin(text) : null;

  return titles.filter(
    (title) =>
      (filter === 'ALL' || title.priceSource === filter) &&
      (foundIds.has(title.instrumentId) ||
        (isin !== null && title.isin === isin) ||
        normalizeSearch(
          `${title.instrumentName} ${title.isin ?? ''} ${title.symbol ?? ''} ${title.sourceRef ?? ''}`,
        ).includes(needle)),
  );
};
