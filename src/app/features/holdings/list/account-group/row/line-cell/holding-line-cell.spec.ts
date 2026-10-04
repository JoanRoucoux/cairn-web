import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { render } from '@testing-library/angular';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingLineCell } from './holding-line-cell';

const manual = {
  id: 'h1',
  instrumentName: 'Northwind Private Equity',
  isin: 'FR0013280799',
  assetClass: 'FUND',
  priceSource: 'MANUAL',
  quantity: 10.55,
  price: 124.3,
  priceCurrency: 'EUR',
  priceAsOf: '2026-09-25',
  stale: false,
} as HoldingResponse;

const subsOf = async (holding: HoldingResponse, compact = false): Promise<string[]> => {
  const { container } = await render(
    '<table><tbody><tr><td app-holding-line-cell [compact]="compact" [holding]="holding"></td></tr></tbody></table>',
    {
      componentProperties: { holding, compact },
      imports: [HoldingLineCell, getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: LOCALE_ID, useValue: 'en-GB' }],
    },
  );

  return [...container.querySelectorAll('[uiCellSub]')].map(
    (sub) => sub.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );
};

describe('HoldingLineCell', () => {
  it('ends the desktop subtitle with Saisie manuelle for a manual price', async () => {
    const [desktop] = await subsOf(manual);

    expect(desktop).toBe('FR0013280799 · enums.assetClass.FUND · enums.priceSource.MANUAL');
  });

  it('keeps the subtitle to the ISIN and the class for a fetched price', async () => {
    const [desktop] = await subsOf({ ...manual, priceSource: 'YAHOO' });

    expect(desktop).toBe('FR0013280799 · enums.assetClass.FUND');
  });

  it('says Saisie manuelle instead of the class in the compact table', async () => {
    expect(await subsOf(manual, true)).toEqual(['enums.priceSource.MANUAL']);
  });

  it('keeps the class in the compact table for a fetched price', async () => {
    expect(await subsOf({ ...manual, priceSource: 'AMUNDI' }, true)).toEqual(['enums.assetClass.FUND']);
  });

  it('lets a missing quote win over Saisie manuelle in the compact table', async () => {
    expect(await subsOf({ ...manual, price: null }, true)).toEqual(['holdings.noQuote']);
  });
});
