import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

@Component({ selector: 'app-stub-detail', template: 'detail' })
class StubDetail {}

const accounts = [{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' }];

const holdings = [
  {
    id: 'h1',
    accountId: 'a1',
    accountName: 'Saxo Investor',
    accountType: 'PEA',
    instrumentName: 'BNP Paribas Easy S&P 500',
    quantity: 676,
    price: 33.3069,
    marketValueEur: 22515.47,
    unrealizedGainEur: 4497.36,
    stale: false,
  },
  {
    id: 'h3',
    accountId: 'a2',
    accountName: 'Esalia',
    accountType: 'PEE',
    instrumentName: 'FCPE Actions',
    quantity: 412.5,
    price: 289.11,
    marketValueEur: 119258,
    unrealizedGainEur: null,
    stale: true,
  },
];

describe('HoldingListPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (
    initialRoute = '/',
    fixtureHoldings: unknown[] = holdings,
  ): Promise<Awaited<ReturnType<typeof render>>> => {
    const result = await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: '', component: HoldingListPage }],
      initialRoute,
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush(fixtureHoldings);
    httpTesting.expectOne('/api/accounts').flush(accounts);

    return result;
  };

  afterEach(() => httpTesting.verify());

  it('should group the holdings by account', async () => {
    await renderPage();

    expect(await screen.findAllByText('Esalia')).not.toHaveLength(0);
    expect(screen.getAllByText('Saxo Investor')).not.toHaveLength(0);
  });

  it('should filter as the user types', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Esalia');

    await user.type(screen.getByTestId('holdings-search'), 'bnp paribas');

    expect(await screen.findAllByText('Saxo Investor')).not.toHaveLength(0);
    expect(screen.queryByText('Esalia')).not.toBeInTheDocument();
  });

  it('names the search box with its label, not only its placeholder', async () => {
    await renderPage();

    expect(await screen.findByRole('searchbox', { name: 'holdings.searchLabel' })).toHaveAttribute(
      'placeholder',
      'holdings.searchPlaceholder',
    );
  });

  it('tells the user what was searched when nothing matches', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Esalia');

    await user.type(screen.getByTestId('holdings-search'), 'zzz');

    expect(await screen.findByText('holdings.noSearchResults')).toBeInTheDocument();
  });

  it('opens the add dialog', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Esalia');

    await user.click(screen.getByTestId('add-holding-desktop'));

    expect(screen.getByTestId('holding-add-dialog')).toBeInTheDocument();

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(accounts));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
  });

  it('closes the add dialog when it is dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Esalia');

    await user.click(screen.getByTestId('add-holding-desktop'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(accounts));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
    screen.getByRole('dialog').dispatchEvent(new Event('close'));

    await vi.waitFor(() => expect(screen.queryByTestId('holding-add-dialog')).not.toBeInTheDocument());
  });

  it('reloads the list once a line is added', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Esalia');

    await user.click(screen.getByTestId('add-holding-desktop'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(accounts));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
    await screen.findByRole('option', { name: 'Saxo Investor' });

    await user.selectOptions(screen.getByTestId('holding-add-account'), 'a1');
    await user.type(screen.getByTestId('holding-add-query'), 'zzz');
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([]);
    await user.click(await screen.findByTestId('holding-add-create-manual'));
    await user.selectOptions(screen.getByTestId('holding-add-asset-class'), 'ETF');
    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    await user.click(screen.getByTestId('holding-add-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({ id: 'i9' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({});
    await vi.waitFor(() => httpTesting.expectOne('/api/holdings').flush(holdings));

    expect(await screen.findAllByText('Esalia')).not.toHaveLength(0);
  });

  it('reloads the list after the cash balance is set', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Esalia');

    await user.click(screen.getAllByTestId('edit-cash')[0]!);
    await user.type(screen.getByTestId('holding-cash-amount'), '500');
    await user.click(screen.getByTestId('holding-cash-submit'));

    await vi.waitFor(() =>
      httpTesting
        .expectOne((request) => request.method === 'PUT' && request.url.endsWith('/cash'))
        .flush(null, { status: 204, statusText: 'No Content' }),
    );
    await vi.waitFor(() => httpTesting.expectOne({ url: '/api/holdings', method: 'GET' }).flush(holdings));

    expect(await screen.findAllByText('Esalia')).not.toHaveLength(0);
  });

  it('closes the cash dialog when it is dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Esalia');

    await user.click(screen.getAllByTestId('edit-cash')[0]!);
    await user.click(await screen.findByTestId('holding-cash-cancel'));

    expect(screen.queryByTestId('holding-cash-dialog')).not.toBeInTheDocument();
  });

  it('should tell the user when holdings fail to load', async () => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: '', component: HoldingListPage }],
      initialRoute: '/',
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush('boom', { status: 500, statusText: 'Server error' });
    httpTesting.expectOne('/api/accounts').flush(accounts);

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.error');
  });

  it('should link each line to its detail screen', async () => {
    await renderPage();
    await screen.findAllByText('Esalia');

    const links = await screen.findAllByRole('link', { name: /FCPE Actions/ });

    for (const link of links) {
      expect(link).toHaveAttribute('href', '/holdings/h3');
    }
  });

  it('shows the icon add button on the iPhone and the filled one on desktop only', async () => {
    await renderPage();
    await screen.findAllByText('Esalia');

    expect(screen.getByTestId('add-holding').parentElement).toHaveClass('lg:hidden');
    expect(screen.getByTestId('add-holding-desktop').parentElement).toHaveClass('hidden', 'lg:block');
  });

  it('opens the add dialog from the mobile icon button too', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Esalia');

    await user.click(screen.getByTestId('add-holding'));

    expect(screen.getByTestId('holding-add-dialog')).toBeInTheDocument();

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(accounts));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
  });

  it('should show a skeleton while loading', async () => {
    const { fixture } = await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: '', component: HoldingListPage }],
      initialRoute: '/',
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);

    expect(fixture.nativeElement.querySelector('ui-skeleton')).toBeInTheDocument();
    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts);
  });

  it('should show the empty state when there is nothing to search through', async () => {
    await renderPage('/', []);

    expect(await screen.findByText('holdings.empty')).toBeInTheDocument();
  });

  it('shows a removable chip for the stale filter and removes it', async () => {
    const user = userEvent.setup();
    await renderPage('/?filter=stale');
    await screen.findAllByText('Esalia');

    const chip = screen.getByTestId('filter-chip-stale');
    expect(chip).toHaveTextContent('holdings.filters.stale');
    expect(screen.queryByText('Saxo Investor')).not.toBeInTheDocument();

    await user.click(chip);

    expect(await screen.findAllByText('Saxo Investor')).not.toHaveLength(0);
  });

  it('shows a removable chip for the account filter and removes it', async () => {
    const user = userEvent.setup();
    await renderPage('/?account=Saxo Investor');
    await screen.findAllByText('Saxo Investor');

    const chip = screen.getByTestId('filter-chip-account');
    expect(screen.queryByText('Esalia')).not.toBeInTheDocument();

    await user.click(chip);

    expect(await screen.findAllByText('Esalia')).not.toHaveLength(0);
  });

  it('returns focus to the row of the closed line once the detail closes', async () => {
    const { fixture } = await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: '', component: HoldingListPage, children: [{ path: ':holdingId', component: StubDetail }] }],
      initialRoute: '/h1',
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await screen.findByText('detail');

    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    TestBed.tick();

    expect(fixture.nativeElement.querySelector('[data-holding-id="h1"]')).toHaveFocus();
  });

  it('opens the cash dialog from the mobile cash line', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Esalia');

    await user.click(screen.getAllByTestId('edit-cash-mobile')[0]!);

    expect(await screen.findByTestId('holding-cash-cancel')).toBeInTheDocument();
  });

  it('switches to the short placeholder below the desktop breakpoint', async () => {
    let listener: () => void = () => undefined;
    const query = {
      matches: false,
      addEventListener: (_: string, callback: () => void) => (listener = callback),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', () => query);
    await renderPage();
    await screen.findAllByText('Esalia');

    expect(screen.getByTestId('holdings-search')).toHaveAttribute('placeholder', 'holdings.searchPlaceholderShort');

    query.matches = true;
    listener();

    await vi.waitFor(() =>
      expect(screen.getByTestId('holdings-search')).toHaveAttribute('placeholder', 'holdings.searchPlaceholder'),
    );
    vi.unstubAllGlobals();
  });

  it('opens the add dialog with the account of the add query param, then clears it', async () => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: '', component: HoldingListPage }],
      initialRoute: '/?add=a1',
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush(holdings);
    for (const request of httpTesting.match('/api/accounts')) {
      request.flush(accounts);
    }

    expect(await screen.findByTestId('holding-add-dialog')).toBeInTheDocument();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    await vi.waitFor(() => expect(screen.getByTestId('holding-add-account')).toHaveValue('a1'));
    httpTesting.match('/api/instruments').forEach((request) => request.flush([]));
  });

  it('shows a removable chip for the asset class filter and removes it', async () => {
    const user = userEvent.setup();
    await renderPage('/?assetClass=ETF', [
      { ...holdings[0], assetClass: 'ETF' },
      { ...holdings[1], assetClass: 'FUND' },
    ]);
    await screen.findAllByText('Saxo Investor');

    const chip = screen.getByTestId('filter-chip-asset-class');
    expect(screen.queryByText('Esalia')).not.toBeInTheDocument();

    await user.click(chip);

    expect(await screen.findAllByText('Esalia')).not.toHaveLength(0);
  });
});
