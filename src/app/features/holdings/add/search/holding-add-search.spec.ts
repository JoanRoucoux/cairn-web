import { provideZonelessChangeDetection } from '@angular/core';

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
  const renderSearch = (groups: ResultGroup[]): Promise<RenderResult<HoldingAddSearch>> =>
    render(HoldingAddSearch, {
      inputs: {
        query: 'north',
        filter: 'ALL',
        showResults: true,
        tracked: [],
        trackedState: 'ready',
        groups,
        noneFound: false,
        narrowed: false,
      },
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection()],
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
});
