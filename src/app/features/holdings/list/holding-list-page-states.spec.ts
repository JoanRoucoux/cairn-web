import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const accounts = [{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' }];

const unpriced = {
  id: 'h9',
  accountId: 'a1',
  accountName: 'Saxo Investor',
  accountType: 'PEA',
  instrumentId: 'i9',
  instrumentName: 'Newly listed fund',
  assetClass: 'FUND',
  quantity: 3,
  price: null,
  marketValueEur: null,
  stale: false,
};

describe('HoldingListPage states', () => {
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
  };

  afterEach(() => httpTesting.verify());

  it('shows a skeleton shaped like the list while loading', async () => {
    await renderPage();

    expect(await screen.findByTestId('holdings-loading')).toBeInTheDocument();
    expect(screen.getByTestId('holdings-loading-rows').children).toHaveLength(8);
    expect(screen.getByTestId('holdings-loading-cards').children).toHaveLength(2);
    httpTesting.expectOne('/api/holdings').flush([]);
    httpTesting.expectOne('/api/accounts').flush(accounts);
  });

  it('keeps the rows on screen while a change reloads the list', async () => {
    await renderPage();
    httpTesting.expectOne('/api/holdings').flush([unpriced]);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await screen.findAllByText('Newly listed fund');

    TestBed.inject(HoldingChanges).touched('h9');
    TestBed.tick();
    const reload = await vi.waitFor(() => httpTesting.expectOne({ url: '/api/holdings', method: 'GET' }));

    expect(screen.queryByTestId('holdings-loading')).not.toBeInTheDocument();
    expect(screen.getAllByText('Newly listed fund').length).toBeGreaterThan(0);

    reload.flush([{ ...unpriced, instrumentName: 'Renamed fund' }]);
    expect((await screen.findAllByText('Renamed fund')).length).toBeGreaterThan(0);
  });

  it('shows the error block and retries only the holdings call', async () => {
    const user = userEvent.setup();
    await renderPage();
    httpTesting.expectOne('/api/holdings').flush('boom', { status: 500, statusText: 'Server error' });
    httpTesting.expectOne('/api/accounts').flush(accounts);

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.errorTitle');
    expect(screen.getByRole('alert')).toHaveTextContent('holdings.errorMessage');

    await user.click(screen.getByRole('button', { name: 'holdings.retry' }));

    const retried = await vi.waitFor(() => httpTesting.expectOne({ url: '/api/holdings', method: 'GET' }));
    expect(await screen.findByTestId('holdings-loading')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    retried.flush([unpriced]);
    expect((await screen.findAllByText('Newly listed fund')).length).toBeGreaterThan(0);
  });

  it('prints no dangling separator for a blank institution', async () => {
    await renderPage();
    httpTesting.expectOne('/api/holdings').flush([unpriced]);
    httpTesting.expectOne('/api/accounts').flush([{ ...accounts[0], institution: '  ' }]);

    const metas = await screen.findAllByText(/enums.accountType.PEA/);

    for (const meta of metas) {
      expect(meta.textContent).not.toMatch(/·\s*·/);
      expect(meta.textContent?.trim()).not.toMatch(/·$/);
    }
  });

  it('survives an accounts call that fails', async () => {
    await renderPage();
    httpTesting.expectOne('/api/holdings').flush([unpriced]);
    httpTesting.expectOne('/api/accounts').flush('boom', { status: 500, statusText: 'Server error' });

    expect((await screen.findAllByText('Newly listed fund')).length).toBeGreaterThan(0);
  });

  it('opens the manual quote dialog from an unvalued line and reloads once saved', async () => {
    const user = userEvent.setup();
    await renderPage();
    httpTesting.expectOne('/api/holdings').flush([unpriced]);
    httpTesting.expectOne('/api/accounts').flush(accounts);

    await user.click(await screen.findByTestId('enter-quote'));
    await user.type(await screen.findByTestId('manual-quote-price'), '12.5');
    await user.click(screen.getByTestId('manual-quote-submit'));

    await vi.waitFor(() => httpTesting.expectOne((request) => request.method === 'POST').flush({}));
    await vi.waitFor(() => httpTesting.expectOne({ url: '/api/holdings', method: 'GET' }).flush([unpriced]));
    await vi.waitFor(() => expect(screen.queryByTestId('manual-quote-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.quoteSaved');
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('h9');
  });

  it('closes the manual quote dialog when it is dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();
    httpTesting.expectOne('/api/holdings').flush([unpriced]);
    httpTesting.expectOne('/api/accounts').flush(accounts);

    await user.click(await screen.findByTestId('enter-quote'));
    await user.click(await screen.findByTestId('manual-quote-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('manual-quote-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
  });
});
