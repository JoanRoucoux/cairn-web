import type { HoldingResponse, InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { type SourceResult, groupsFor, trackedIdsFound, trackedMatches, trackedTitlesOf } from './result-groups';
import { type PlannedSource, resultKey } from './search-plan';

const candidate = (overrides: Partial<InstrumentCandidateResponse> = {}): InstrumentCandidateResponse => ({
  name: 'Amundi MSCI World',
  source: 'YAHOO',
  sourceRef: 'CW8.PA',
  assetClass: 'ETF',
  currency: 'EUR',
  ...overrides,
});

const holding = (overrides: Partial<HoldingResponse> = {}): HoldingResponse =>
  ({
    id: 'h1',
    accountId: 'a1',
    instrumentId: 'i1',
    instrumentName: 'Amundi MSCI World',
    isin: 'LU1681043599',
    symbol: 'CW8',
    sourceRef: 'CW8.PA',
    assetClass: 'ETF',
    priceSource: 'YAHOO',
    ...overrides,
  }) as HoldingResponse;

const ready = (...candidates: InstrumentCandidateResponse[]): SourceResult => ({ state: 'ready', candidates });

const plan = (...sources: PlannedSource['source'][]): PlannedSource[] =>
  sources.map((source) => ({ source, query: 'msci' }));

const results = (entries: [PlannedSource['source'], SourceResult][]): Map<string, SourceResult> =>
  new Map(entries.map(([source, result]) => [resultKey(source, 'msci'), result]));

describe('trackedTitlesOf', () => {
  it('keeps one title per instrument and never the cash', () => {
    const titles = trackedTitlesOf([
      holding(),
      holding({ id: 'h2', accountId: 'a2' }),
      holding({ id: 'h3', instrumentId: 'cash', assetClass: 'CASH', accountCash: true }),
      holding({ id: 'h4', instrumentId: 'livret', assetClass: 'CASH' }),
    ]);

    expect(titles.map((title) => title.id)).toEqual(['h1']);
  });
});

describe('groupsFor', () => {
  it('shows a group still loading, or not yet asked, as loading', () => {
    const groups = groupsFor(
      plan('YAHOO', 'COINGECKO'),
      results([['YAHOO', { state: 'loading', candidates: [] }]]),
      new Set(),
      'ALL',
    );

    expect(groups.map((group) => group.state)).toEqual(['loading', 'loading']);
  });

  it('marks an Amundi search without an ISIN as short', () => {
    expect(groupsFor([{ source: 'AMUNDI', query: null }], new Map(), new Set(), 'AMUNDI')).toEqual([
      { source: 'AMUNDI', state: 'short', candidates: [] },
    ]);
  });

  it('drops a result already tracked, which only shows under Déjà suivi', () => {
    const tracked = candidate({ trackedInstrumentId: 'i1' });
    const unknownTitle = candidate({ sourceRef: 'MWRD.PA', trackedInstrumentId: 'gone' });
    const [group] = groupsFor(
      plan('YAHOO'),
      results([['YAHOO', ready(tracked, unknownTitle)]]),
      new Set(['i1']),
      'YAHOO',
    );

    expect(group?.candidates).toEqual([unknownTitle]);
  });

  it('puts a foreign listing last within its group', () => {
    const usd = candidate({ sourceRef: 'IWDA.L', currency: 'USD' });
    const eur = candidate({ sourceRef: 'EUNL.DE' });
    const unknown = candidate({ sourceRef: 'IWDA.AS', currency: null });
    const [group] = groupsFor(plan('YAHOO'), results([['YAHOO', ready(usd, eur, unknown)]]), new Set(), 'ALL');

    expect(group?.candidates.map((row) => row.sourceRef)).toEqual(['EUNL.DE', 'IWDA.AS', 'IWDA.L']);
  });

  it('with every source, hides empty groups and orders usable, pending, then foreign-only ones', () => {
    const groups = groupsFor(
      plan('YAHOO', 'COINGECKO', 'AMUNDI'),
      results([
        ['YAHOO', ready(candidate({ currency: 'USD' }))],
        ['COINGECKO', { state: 'error', candidates: [] }],
        ['AMUNDI', ready(candidate({ source: 'AMUNDI', sourceRef: 'LU1681043599' }))],
      ]),
      new Set(),
      'ALL',
    );

    expect(groups.map((group) => group.source)).toEqual(['AMUNDI', 'COINGECKO', 'YAHOO']);
    expect(groupsFor(plan('YAHOO'), results([['YAHOO', ready()]]), new Set(), 'ALL')).toEqual([]);
  });

  it('with one source, keeps its group even when empty', () => {
    expect(groupsFor(plan('COINGECKO'), results([['COINGECKO', ready()]]), new Set(), 'COINGECKO')).toEqual([
      { source: 'COINGECKO', state: 'ready', candidates: [] },
    ]);
  });
});

describe('trackedIdsFound', () => {
  it('collects the tracked titles the asked sources returned', () => {
    const found = trackedIdsFound(
      [...plan('YAHOO'), { source: 'AMUNDI', query: null }],
      results([['YAHOO', ready(candidate({ trackedInstrumentId: 'i1' }), candidate({ sourceRef: 'EUNL.DE' }))]]),
    );

    expect([...found]).toEqual(['i1']);
    expect([...trackedIdsFound(plan('COINGECKO'), new Map())]).toEqual([]);
  });
});

describe('trackedMatches', () => {
  const titles = [
    holding(),
    holding({
      instrumentId: 'i2',
      instrumentName: 'Solana',
      isin: null,
      symbol: 'SOL',
      sourceRef: 'solana',
      assetClass: 'CRYPTO',
      priceSource: 'COINGECKO',
    }),
    holding({
      instrumentId: 'i3',
      instrumentName: 'Corum Origin',
      isin: null,
      symbol: null,
      sourceRef: null,
      priceSource: 'MANUAL',
    }),
  ];
  const ids = (matches: HoldingResponse[]): string[] => matches.map((match) => match.instrumentId);

  it('matches the name, accents and case aside, the symbol and the source reference', () => {
    expect(ids(trackedMatches(titles, 'msci', 'ALL', new Set()))).toEqual(['i1']);
    expect(ids(trackedMatches(titles, 'sol', 'ALL', new Set()))).toEqual(['i2']);
    expect(ids(trackedMatches(titles, 'CÔRUM', 'ALL', new Set()))).toEqual(['i3']);
    expect(ids(trackedMatches(titles, 'cw8.pa', 'ALL', new Set()))).toEqual(['i1']);
  });

  it('matches an ISIN typed with spaces', () => {
    expect(ids(trackedMatches(titles, 'LU16 8104 3599', 'ALL', new Set()))).toEqual(['i1']);
  });

  it('adds a title a source found under a name the local match misses', () => {
    expect(ids(trackedMatches(titles, 'world index', 'ALL', new Set(['i1'])))).toEqual(['i1']);
  });

  it('keeps only the titles of the chosen source', () => {
    expect(ids(trackedMatches(titles, 'o', 'COINGECKO', new Set()))).toEqual(['i2']);
  });
});
