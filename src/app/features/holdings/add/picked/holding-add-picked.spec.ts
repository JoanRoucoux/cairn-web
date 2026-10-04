import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';

import { render, screen } from '@testing-library/angular';

import type { HoldingResponse, InstrumentCandidateResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { PickedTitle } from '../holding-add-dialog-store';
import { HoldingAddPicked } from './holding-add-picked';

const candidate: InstrumentCandidateResponse = {
  name: 'Solana',
  source: 'COINGECKO',
  sourceRef: 'solana',
  symbol: 'SOL',
  assetClass: 'CRYPTO',
  probePrice: 142.18,
  currency: 'EUR',
};

describe('HoldingAddPicked', () => {
  const renderCard = async (title: PickedTitle): Promise<void> => {
    await render(HoldingAddPicked, {
      inputs: { title },
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
    });
  };

  it('names a coin by its symbol, with its source and trial price', async () => {
    await renderCard({ kind: 'online', candidate });

    expect(screen.getByTestId('holding-add-picked-sub')).toHaveTextContent(/^SOL$/);
    expect(screen.getByTestId('holding-add-source-line')).toHaveTextContent(
      'enums.priceSource.COINGECKO · holdings.add.sourceLine.COINGECKO · holdings.add.trial €142.18',
    );
  });

  it('names a Yahoo Finance listing by its place and reference when it has neither ISIN nor symbol', async () => {
    await renderCard({
      kind: 'online',
      candidate: { ...candidate, source: 'YAHOO', sourceRef: 'CW8.PA', symbol: null, exchange: 'Paris' },
    });

    expect(screen.getByTestId('holding-add-picked-sub')).toHaveTextContent(/^Paris · CW8.PA$/);
  });

  it('names a coin by its id when it has no symbol, without a trial price when the probe failed', async () => {
    await renderCard({ kind: 'online', candidate: { ...candidate, symbol: null, probePrice: null } });

    expect(screen.getByTestId('holding-add-picked-sub')).toHaveTextContent(/^solana$/);
    expect(screen.getByTestId('holding-add-source-line')).not.toHaveTextContent('holdings.add.trial');
  });

  it('dates the net asset value of an Amundi fund and drops the word trial', async () => {
    await renderCard({
      kind: 'online',
      candidate: {
        ...candidate,
        name: 'Amundi MSCI World',
        source: 'AMUNDI',
        sourceRef: 'LU1681043599',
        isin: 'LU1681043599',
        probeAsOf: '2026-09-24',
        probePrice: 528.31,
      },
    });

    expect(screen.getByTestId('holding-add-picked-sub')).toHaveTextContent(/^LU1681043599$/);
    expect(screen.getByTestId('holding-add-source-line')).toHaveTextContent(
      /^enums.priceSource.AMUNDI · holdings.add.sourceLine.AMUNDI_ON · €528.31$/,
    );
  });

  it('falls back to the plain net asset value line and the reference for an undated Amundi fund', async () => {
    await renderCard({ kind: 'online', candidate: { ...candidate, source: 'AMUNDI', sourceRef: 'QS0009119224' } });

    expect(screen.getByTestId('holding-add-picked-sub')).toHaveTextContent(/^QS0009119224$/);
    expect(screen.getByTestId('holding-add-source-line')).toHaveTextContent('holdings.add.sourceLine.AMUNDI ·');
  });

  it('names a tracked title by its ISIN, or its symbol, and its class, never as new', async () => {
    const title = {
      instrumentName: 'Bitcoin',
      isin: null,
      symbol: 'BTC',
      assetClass: 'CRYPTO',
      priceSource: 'COINGECKO',
    };
    await renderCard({ kind: 'tracked', title: title as HoldingResponse });

    expect(screen.getByTestId('holding-add-picked-sub')).toHaveTextContent(/^BTC · enums.assetClass.CRYPTO$/);
    expect(screen.queryByText('holdings.add.newBadge')).not.toBeInTheDocument();
  });

  it('shows only the class of a tracked title without any identifier', async () => {
    const title = { instrumentName: 'Corum Origin', assetClass: 'OTHER', priceSource: 'MANUAL' };
    await renderCard({ kind: 'tracked', title: title as HoldingResponse });

    expect(screen.getByTestId('holding-add-picked-sub')).toHaveTextContent(/^enums.assetClass.OTHER$/);
    expect(screen.getByTestId('holding-add-source-line')).toHaveTextContent(
      'enums.priceSource.MANUAL · holdings.add.sourceLine.tracked',
    );
  });
});
