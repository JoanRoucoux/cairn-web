import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { type RenderResult, render, screen } from '@testing-library/angular';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioMovers } from './portfolio-movers';

const holding = (overrides: Partial<HoldingResponse>): HoldingResponse =>
  ({
    id: 'h1',
    instrumentId: 'i1',
    instrumentName: 'Ethereum',
    accountName: 'Binance',
    marketValueEur: 9580.84,
    dayChangeEur: 316.54,
    ...overrides,
  }) as HoldingResponse;

const renderMovers = (holdings: HoldingResponse[]): Promise<RenderResult<PortfolioMovers>> =>
  render(PortfolioMovers, {
    inputs: { holdings },
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('PortfolioMovers', () => {
  it('should list the four largest absolute moves of the day', async () => {
    await renderMovers([
      holding({ id: 'a', instrumentName: 'Small', dayChangeEur: 1 }),
      holding({ id: 'b', instrumentName: 'Big loss', dayChangeEur: -900 }),
      holding({ id: 'c', instrumentName: 'Big gain', dayChangeEur: 800 }),
      holding({ id: 'd', instrumentName: 'Medium', dayChangeEur: 400 }),
      holding({ id: 'e', instrumentName: 'Another', dayChangeEur: 300 }),
    ]);

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Big loss');
  });

  it('should ignore holdings whose day change is unknown', async () => {
    await renderMovers([
      holding({ id: 'a', dayChangeEur: null }),
      holding({ id: 'b', dayChangeEur: undefined }),
      holding({ id: 'c', dayChangeEur: 10 }),
    ]);

    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
  });

  it('should link each row to its holding', async () => {
    await renderMovers([holding({ id: 'h9' })]);

    expect(await screen.findByRole('link', { name: /Ethereum/ })).toHaveAttribute('href', '/holdings/h9');
  });
});
