import { provideZonelessChangeDetection } from '@angular/core';

import { UiAnnouncer } from '@joanroucoux/cairn-ui/announcer';
import { type RenderResult, render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { ResultGroup } from '../result-groups';
import { HoldingAddSearch } from './holding-add-search';

const candidate = {
  source: 'YAHOO',
  sourceRef: 'NWGE.AS',
  name: 'Northwind Global Equity',
  symbol: 'NWGE.AS',
  currency: 'EUR',
};

const ready: ResultGroup[] = [{ source: 'YAHOO', state: 'ready', candidates: [candidate] as never }];
const pending: ResultGroup[] = [{ source: 'YAHOO', state: 'pending', candidates: [] }];

describe('HoldingAddSearch', () => {
  const announce = vi.fn();

  beforeEach(() => announce.mockClear());

  const renderSearch = (groups: ResultGroup[], noneFound = false): Promise<RenderResult<HoldingAddSearch>> =>
    render(HoldingAddSearch, {
      inputs: {
        query: 'north',
        filter: 'ALL',
        showResults: true,
        tracked: [],
        trackedState: 'ready',
        groups,
        noneFound,
        narrowed: false,
      },
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), { provide: UiAnnouncer, useValue: { announce } }],
    });

  it('keeps the previous results on screen while the next query waits for its request', async () => {
    const { fixture } = await renderSearch(ready);

    expect(screen.getByTestId('holding-add-results')).toHaveTextContent('Northwind Global Equity');

    fixture.componentRef.setInput('groups', pending);
    await fixture.whenStable();

    expect(screen.getByTestId('holding-add-results')).toHaveTextContent('Northwind Global Equity');

    fixture.componentRef.setInput('groups', [{ source: 'YAHOO', state: 'loading', candidates: [] }]);
    await fixture.whenStable();

    expect(screen.getByTestId('holding-add-results')).not.toHaveTextContent('Northwind Global Equity');
  });

  it('draws no card when nothing was shown before the first request', async () => {
    await renderSearch(pending);

    expect(screen.queryByTestId('holding-add-results')).not.toBeInTheDocument();
  });

  it('announces the number of results once the sources have answered', async () => {
    const { fixture } = await renderSearch(ready);

    await fixture.whenStable();

    expect(announce).toHaveBeenCalledExactlyOnceWith('holdings.add.resultCount_one');
  });

  it('counts every candidate with the plural form', async () => {
    const { fixture } = await renderSearch([
      { source: 'YAHOO', state: 'ready', candidates: [candidate, candidate] as never },
    ]);

    await fixture.whenStable();

    expect(announce).toHaveBeenCalledExactlyOnceWith('holdings.add.resultCount_other');
  });

  it('stays silent while a source is still loading or waiting', async () => {
    const { fixture } = await renderSearch([{ source: 'YAHOO', state: 'loading', candidates: [] }]);

    await fixture.whenStable();
    fixture.componentRef.setInput('groups', pending);
    await fixture.whenStable();

    expect(announce).not.toHaveBeenCalled();
  });

  it('announces the none-found message when nothing came back', async () => {
    const { fixture } = await renderSearch([], true);

    await fixture.whenStable();

    expect(announce).toHaveBeenCalledExactlyOnceWith('holdings.add.noneFound');
  });

  it('stays silent when nothing is shown', async () => {
    const { fixture } = await renderSearch(ready);

    announce.mockClear();
    fixture.componentRef.setInput('showResults', false);
    await fixture.whenStable();

    expect(announce).not.toHaveBeenCalled();
  });
});
