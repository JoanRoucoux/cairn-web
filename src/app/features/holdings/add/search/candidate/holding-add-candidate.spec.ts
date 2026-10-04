import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingAddCandidate } from './holding-add-candidate';

const yahoo: InstrumentCandidateResponse = {
  name: 'iShares Core MSCI World',
  source: 'YAHOO',
  sourceRef: 'EUNL.DE',
  isin: 'IE00B4L5Y983',
  exchange: 'Xetra',
  symbol: 'EUNL.DE',
  assetClass: 'ETF',
  probePrice: 97.84,
  currency: 'EUR',
};

describe('HoldingAddCandidate', () => {
  const picked = vi.fn();

  const renderRow = async (candidate: InstrumentCandidateResponse): Promise<HTMLElement> => {
    await render(HoldingAddCandidate, {
      inputs: { candidate },
      on: { picked },
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
    });

    return screen.getByTestId('holding-add-online-candidate');
  };

  afterEach(() => picked.mockClear());

  it('draws a Yahoo Finance listing as ISIN, place and symbol, at its trial price', async () => {
    const row = await renderRow(yahoo);

    expect(row).toHaveTextContent(/IE00B4L5Y983 · Xetra · EUNL.DE\s*€97.84\s*holdings.add.priceCaption.YAHOO/);

    await userEvent.setup().click(row);
    expect(picked).toHaveBeenCalledWith(yahoo);
  });

  it('falls back to the source reference when a listing has no symbol', async () => {
    const row = await renderRow({ ...yahoo, isin: null, exchange: null, symbol: null });

    expect(row).toHaveTextContent(/^iShares Core MSCI World\s*EUNL.DE\s*€/);
  });

  it('draws a coin as symbol and id, priced in euros', async () => {
    const row = await renderRow({
      ...yahoo,
      name: 'Solana',
      source: 'COINGECKO',
      sourceRef: 'solana',
      symbol: 'SOL',
      isin: null,
      exchange: null,
      probePrice: 142.18,
    });

    expect(row).toHaveTextContent(/SOL · solana\s*€142.18\s*holdings.add.priceCaption.COINGECKO/);
  });

  it('draws an Amundi fund with its ISIN and the date of its net asset value', async () => {
    const amundi: InstrumentCandidateResponse = {
      ...yahoo,
      name: 'Amundi MSCI World',
      source: 'AMUNDI',
      sourceRef: 'LU1681043599',
      isin: null,
    };

    expect(await renderRow({ ...amundi, probeAsOf: '2026-09-24' })).toHaveTextContent(
      /LU1681043599\s*· holdings.add.navOn\s*€97.84\s*holdings.add.priceCaption.AMUNDI/,
    );
  });

  it('draws an Amundi fund without a date when the probe failed', async () => {
    const row = await renderRow({ ...yahoo, source: 'AMUNDI', sourceRef: 'LU1681043599', probePrice: null });

    expect(row).not.toHaveTextContent('holdings.add.navOn');
  });

  it('greys out a listing in another currency and never picks it', async () => {
    const row = await renderRow({ ...yahoo, sourceRef: 'IWDA.L', symbol: 'IWDA.L', exchange: 'LSE', currency: 'USD' });

    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveTextContent(
      /LSE · IWDA.L\s*· holdings.add.quotedIn\s*holdings.add.unavailable\s*holdings.add.euroOnly/,
    );

    await userEvent.setup().click(row);
    expect(picked).not.toHaveBeenCalled();
  });

  it('greys out a foreign listing with no identifier without a stray separator', async () => {
    const row = await renderRow({ ...yahoo, exchange: null, symbol: null, sourceRef: '', currency: 'USD' });

    expect(row).toHaveTextContent(/^iShares Core MSCI World\s*holdings.add.quotedIn/);
  });
});
