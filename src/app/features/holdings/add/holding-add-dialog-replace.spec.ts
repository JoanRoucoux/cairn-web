import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingAddDialog } from './holding-add-dialog';

const accounts = [{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' }];
const instruments = [
  { id: 'i1', name: 'Amundi MSCI World', isin: 'LU1681043599', currency: 'EUR', assetClass: 'ETF' },
  { id: 'i2', name: 'iShares MSCI World USD', isin: 'IE00B4L5Y983', currency: 'USD', assetClass: 'ETF' },
  { id: 'i3', name: 'Lyxor MSCI USD Tracker', isin: 'LU0000000003', currency: 'EUR', assetClass: 'ETF' },
];

const candidate = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  name: 'iShares Core MSCI World',
  source: 'YAHOO',
  sourceRef: 'IWDA.AS',
  assetClass: 'ETF',
  isin: 'IE00B4L5Y983',
  exchange: 'Euronext Amsterdam',
  probePrice: 97.91,
  currency: 'EUR',
  ...overrides,
});

describe('HoldingAddDialog non-EUR candidates and replace mode', () => {
  let httpTesting: HttpTestingController;
  const saved = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (inputs: Record<string, unknown> = {}, holdings: unknown[] = []): Promise<void> => {
    await render(HoldingAddDialog, {
      inputs,
      on: { saved, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/instruments').flush(instruments);
    httpTesting.expectOne('/api/holdings').flush(holdings);
  };

  afterEach(() => {
    httpTesting.verify();
    saved.mockClear();
    dismissed.mockClear();
  });

  describe('adding a line', () => {
    it('greys a candidate quoted in another currency and never picks it', async () => {
      const user = userEvent.setup();
      await renderDialog();

      await user.type(screen.getByTestId('holding-add-query'), 'ishares world');
      (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
        candidate({ sourceRef: 'IWDA.L', exchange: 'London Stock Exchange', currency: 'USD' }),
      ]);

      const row = await screen.findByTestId('holding-add-online-candidate');
      expect(row).toHaveAttribute('aria-disabled', 'true');
      expect(row).toHaveTextContent('holdings.add.unavailableSub');
      expect(row).toHaveTextContent('London Stock Exchange');
      expect(row).toHaveTextContent('holdings.add.unavailable');
      expect(row).not.toHaveTextContent('holdings.add.trialPriceCaption');

      await user.click(row);

      expect(screen.queryByTestId('holding-add-quantity')).not.toBeInTheDocument();
    });

    it('greys a catalogue instrument quoted in another currency, lists it after the euro ones and never picks it', async () => {
      const user = userEvent.setup();
      await renderDialog({}, [{ id: 'h2', instrumentId: 'i1', priceCurrency: 'USD' }]);

      await user.type(screen.getByTestId('holding-add-query'), 'msci');

      const rows = await screen.findAllByTestId('holding-add-catalog-candidate');
      expect(rows.map((row) => row.querySelector('.font-medium')?.textContent?.trim())).toEqual([
        'Lyxor MSCI USD Tracker',
        'Amundi MSCI World',
        'iShares MSCI World USD',
      ]);
      expect(rows[0]).not.toHaveAttribute('aria-disabled');
      expect(rows[1]).toHaveAttribute('aria-disabled', 'true');
      expect(rows[2]).toHaveAttribute('aria-disabled', 'true');
      expect(rows[1]).toHaveTextContent('holdings.add.unavailable');

      await user.click(rows[1]!);

      expect(screen.queryByTestId('holding-add-quantity')).not.toBeInTheDocument();
      await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
    });

    it('shows a dash when the greyed candidate names no exchange', async () => {
      const user = userEvent.setup();
      await renderDialog();

      await user.type(screen.getByTestId('holding-add-query'), 'ishares world');
      (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
        candidate({ exchange: null, currency: 'GBP' }),
      ]);

      expect(await screen.findByTestId('holding-add-online-candidate')).toHaveTextContent('—');
    });

    it('keeps a candidate of unknown currency selectable and creates it with euro', async () => {
      const user = userEvent.setup();
      await renderDialog();
      await screen.findByRole('option', { name: /Saxo Investor/ });

      await user.type(screen.getByTestId('holding-add-query'), 'ishares world');
      (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
        candidate({ currency: null, probePrice: null }),
      ]);

      const row = await screen.findByTestId('holding-add-online-candidate');
      expect(row).not.toHaveAttribute('aria-disabled');

      await user.click(row);
      await user.type(screen.getByTestId('holding-add-quantity'), '2');
      await user.click(screen.getByTestId('holding-add-submit'));

      const create = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
      expect(create.request.body).toMatchObject({ currency: 'EUR' });
      create.flush({ id: 'i9' });
      (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({ id: 'h9' });
      await vi.waitFor(() => expect(saved).toHaveBeenCalled());
    });
  });

  describe('replace mode', () => {
    const renderReplace = (): Promise<void> => renderDialog({ replaceHoldingId: 'h1', initialQuery: 'IE00B4L5Y983' });

    const resolveWith = async (candidates: unknown[]): Promise<void> => {
      const request = await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'));
      expect(request.request.body).toEqual({ query: 'IE00B4L5Y983' });
      request.flush(candidates);
    };

    it('opens on the ISIN with the search already running, without account nor submit', async () => {
      await renderReplace();
      await resolveWith([candidate({})]);

      expect(screen.getByTestId('holding-add-query')).toHaveValue('IE00B4L5Y983');
      expect(await screen.findByTestId('holding-add-online-candidate')).toBeInTheDocument();
      expect(screen.getByText('holdings.replace.title')).toBeInTheDocument();
      expect(screen.queryByTestId('holding-add-account')).not.toBeInTheDocument();
      expect(screen.queryByTestId('holding-add-submit')).not.toBeInTheDocument();
    });

    it('greys a catalogue instrument quoted in another currency and never lists the line itself', async () => {
      await renderDialog({ replaceHoldingId: 'h1', initialQuery: 'IE00B4L5Y983' }, [
        { id: 'h1', instrumentId: 'i2', priceCurrency: 'USD' },
        { id: 'h2', instrumentId: 'i3', priceCurrency: 'USD' },
      ]);
      await resolveWith([]);

      const user = userEvent.setup();
      await user.clear(screen.getByTestId('holding-add-query'));
      await user.type(screen.getByTestId('holding-add-query'), 'msci');

      const rows = await screen.findAllByTestId('holding-add-catalog-candidate');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('Amundi MSCI World');
      expect(rows[0]).not.toHaveAttribute('aria-disabled');
      expect(rows[1]).toHaveAttribute('aria-disabled', 'true');
      expect(rows[1]).toHaveTextContent('holdings.add.unavailableSub');
      expect(rows[1]).toHaveTextContent('holdings.add.unavailable');
      expect(screen.queryByText('iShares MSCI World USD')).not.toBeInTheDocument();

      await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
    });

    it('creates the chosen listing, moves the line to it and emits saved', async () => {
      const user = userEvent.setup();
      await renderReplace();
      await resolveWith([
        candidate({ sourceRef: 'IWDA.L', exchange: 'London Stock Exchange', currency: 'USD' }),
        candidate({}),
      ]);

      const rows = await screen.findAllByTestId('holding-add-online-candidate');
      await user.click(rows[1]!);

      const create = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
      await vi.waitFor(() => expect(rows[1]).toHaveAttribute('aria-busy', 'true'));
      expect(rows[0]).not.toHaveAttribute('aria-busy', 'true');
      expect(create.request.body).toMatchObject({ currency: 'EUR', sourceRef: 'IWDA.AS' });
      create.flush({ id: 'i9' });
      const move = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'));
      expect(move.request.body).toEqual({ instrumentId: 'i9' });
      move.flush({ id: 'h1' });

      await vi.waitFor(() => expect(saved).toHaveBeenCalledWith({ id: 'h1' }));
    });

    it('moves the line to a catalogue instrument', async () => {
      const user = userEvent.setup();
      await renderDialog({ replaceHoldingId: 'h1', initialQuery: 'amundi' });
      await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));

      await user.click(await screen.findByTestId('holding-add-catalog-candidate'));

      const move = await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'));
      await vi.waitFor(() =>
        expect(screen.getByTestId('holding-add-catalog-candidate')).toHaveAttribute('aria-busy', 'true'),
      );
      expect(move.request.body).toEqual({ instrumentId: 'i1' });
      move.flush({ id: 'h1' });
      await vi.waitFor(() => expect(saved).toHaveBeenCalledWith({ id: 'h1' }));
    });

    it('confirms the change of listing once the dialog has closed, and reveals the moved line', async () => {
      const user = userEvent.setup();
      await renderDialog({ replaceHoldingId: 'h1', initialQuery: 'amundi' });
      await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
      const changes = TestBed.inject(HoldingChanges);

      await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
      (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush({ id: 'h1' });

      await vi.waitFor(() => expect(changes.lastTouched()?.id).toBe('h1'));
      await vi.waitFor(() => expect(saved).toHaveBeenCalled());
      expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.listingChanged');
      expect(changes.lastRevealed()).toBe(changes.lastTouched());
    });

    it('says the account already holds the listing on a 422 and stays open', async () => {
      const user = userEvent.setup();
      await renderDialog({ replaceHoldingId: 'h1', initialQuery: 'amundi' });
      await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));

      await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
      (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush(null, {
        status: 422,
        statusText: 'Unprocessable',
      });

      expect(await screen.findByTestId('holding-add-duplicate')).toHaveTextContent('holdings.replace.duplicate');
      expect(saved).not.toHaveBeenCalled();
    });

    it('shows the generic error on any other failure', async () => {
      const user = userEvent.setup();
      await renderDialog({ replaceHoldingId: 'h1', initialQuery: 'amundi' });
      await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));

      await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
      (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush(null, {
        status: 500,
        statusText: 'Server error',
      });

      expect(await screen.findByTestId('holding-add-error')).toHaveTextContent('holdings.add.error');
      expect(screen.queryByTestId('holding-add-duplicate')).not.toBeInTheDocument();
    });

    it('offers no manual instrument when no euro listing is found', async () => {
      await renderDialog({ replaceHoldingId: 'h1', initialQuery: 'IE00B4L5Y983' }, [
        { id: 'h1', instrumentId: 'i2', priceCurrency: 'USD' },
      ]);
      await resolveWith([]);

      expect(await screen.findByText('holdings.replace.notFound')).toBeInTheDocument();
      expect(screen.queryByTestId('holding-add-create-manual')).not.toBeInTheDocument();
    });
  });
});
