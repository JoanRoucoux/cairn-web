import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { recordMotion } from '@shared/testing/motion';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const accounts = [{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' }];

const usdHolding = {
  id: 'h1',
  accountId: 'a1',
  accountName: 'Saxo Investor',
  accountType: 'PEA',
  instrumentName: 'iShares Core MSCI World USD',
  isin: 'IE00B4L5Y983',
  assetClass: 'ETF',
  quantity: 10,
  price: 112.36,
  priceCurrency: 'USD',
  marketValueEur: null,
  unrealizedGainEur: null,
  stale: false,
};

describe('HoldingListPage change of listing', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (): Promise<void> => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: '', component: HoldingListPage }],
      initialRoute: '/',
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
    httpTesting.expectOne('/api/holdings').flush([usdHolding]);
    httpTesting.expectOne('/api/accounts').flush(accounts);
  };

  const openSearch = async (): Promise<void> => {
    const user = userEvent.setup();
    await user.click(await screen.findByTestId('change-listing'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(accounts));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
    await vi.waitFor(() =>
      httpTesting.expectOne((request) => request.url === '/api/holdings' && request.method === 'GET').flush([]),
    );
  };

  afterEach(() => httpTesting.verify());

  it('opens the search on the ISIN of the line from its Cours cell', async () => {
    await renderPage();
    await openSearch();

    expect(screen.getByTestId('holding-add-query')).toHaveValue('IE00B4L5Y983');
    expect(screen.getByText('holdings.replace.title')).toBeInTheDocument();
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([]);
  });

  it('closes the search when dismissed without touching the line', async () => {
    await renderPage();
    await openSearch();
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([]);

    (screen.getByRole('dialog') as HTMLDialogElement).close();

    await vi.waitFor(() => expect(screen.queryByTestId('holding-add-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(HoldingChanges).lastTouched()).toBeNull();
  });

  it('marks the line as touched, reloads the list, confirms and highlights the moved line', async () => {
    const motion = recordMotion();
    onTestFinished(() => motion.restore());
    const user = userEvent.setup();
    await renderPage();
    await openSearch();
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
      {
        name: 'iShares Core MSCI World',
        source: 'YAHOO',
        sourceRef: 'IWDA.AS',
        assetClass: 'ETF',
        exchange: 'Euronext Amsterdam',
        probePrice: 97.91,
        currency: 'EUR',
      },
    ]);

    await user.click(await screen.findByTestId('holding-add-online-candidate'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({ id: 'i9' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/instrument'))).flush({ id: 'h1' });

    await vi.waitFor(() => expect(screen.queryByTestId('holding-add-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('h1');
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.listingChanged');
    await vi.waitFor(() =>
      httpTesting
        .expectOne((request) => request.url === '/api/holdings' && request.method === 'GET')
        .flush([{ ...usdHolding, priceCurrency: 'EUR', marketValueEur: 1123.6 }]),
    );
    await vi.waitFor(() => expect(screen.queryByTestId('change-listing')).not.toBeInTheDocument());
    await vi.waitFor(() => expect(motion.highlighted.length).toBeGreaterThan(0));
    expect(
      motion.highlighted.every((element) => element.closest('[data-holding-id="h1"], tr:has([data-holding-id="h1"])')),
    ).toBe(true);
  });
});
