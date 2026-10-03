import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { recordMotion } from '@shared/testing/motion';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const accounts = [{ id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' }];

const holdings = [
  {
    id: 'h1',
    accountId: 'a1',
    accountName: 'Northwind PEA',
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
    accountName: 'Woodgrove Savings Plan',
    accountType: 'PEE',
    instrumentName: 'FCPE Actions',
    quantity: 412.5,
    price: 289.11,
    marketValueEur: 60926,
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
        HoldingChanges,
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

  afterEach(() => {
    httpTesting.verify();
    vi.unstubAllGlobals();
  });

  it('should group the holdings by account', async () => {
    await renderPage();

    expect(await screen.findAllByText('Woodgrove Savings Plan')).not.toHaveLength(0);
    expect(screen.getAllByText('Northwind PEA')).not.toHaveLength(0);
  });

  it('should filter as the user types', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    await user.type(screen.getByTestId('holdings-search'), 'bnp paribas');

    expect(await screen.findAllByText('Northwind PEA')).not.toHaveLength(0);
    expect(screen.queryByText('Woodgrove Savings Plan')).not.toBeInTheDocument();
  });

  it('names the search box with its label, not only its placeholder', async () => {
    await renderPage();

    expect(await screen.findByRole('searchbox', { name: 'holdings.searchLabel' })).toHaveAttribute(
      'placeholder',
      'holdings.searchPlaceholderShort',
    );
  });

  it('tells the user what was searched when nothing matches', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    await user.type(screen.getByTestId('holdings-search'), 'zzz');

    expect(await screen.findByText('holdings.noSearchResults')).toBeInTheDocument();
  });

  it('opens the add dialog', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    await user.click(screen.getByTestId('add-holding-desktop'));

    expect(screen.getByTestId('holding-add-dialog')).toBeInTheDocument();

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(accounts));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
    await vi.waitFor(() =>
      httpTesting.expectOne((request) => request.url === '/api/holdings' && request.method === 'GET').flush([]),
    );
  });

  it('closes the add dialog when it is dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    await user.click(screen.getByTestId('add-holding-desktop'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(accounts));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
    await vi.waitFor(() =>
      httpTesting.expectOne((request) => request.url === '/api/holdings' && request.method === 'GET').flush([]),
    );
    (screen.getByRole('dialog') as HTMLDialogElement).close();

    await vi.waitFor(() => expect(screen.queryByTestId('holding-add-dialog')).not.toBeInTheDocument());
  });

  it('reloads the list once a line is added, confirms, then highlights the new line', async () => {
    const motion = recordMotion();
    onTestFinished(() => motion.restore());
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    await user.click(screen.getByTestId('add-holding-desktop'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(accounts));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
    await vi.waitFor(() =>
      httpTesting.expectOne((request) => request.url === '/api/holdings' && request.method === 'GET').flush([]),
    );
    await screen.findByRole('option', { name: /Northwind PEA/ });

    await user.selectOptions(screen.getByTestId('holding-add-account'), 'a1');
    await user.type(screen.getByTestId('holding-add-query'), 'zzz');
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([]);
    await user.click(await screen.findByTestId('holding-add-create-manual'));
    await user.selectOptions(screen.getByTestId('holding-add-asset-class'), 'ETF');
    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    await user.click(screen.getByTestId('holding-add-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({ id: 'i9' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({ id: 'h9' });
    await vi.waitFor(() => expect(screen.queryByTestId('holding-add-dialog')).not.toBeInTheDocument());

    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.added');
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('h9');
    expect(motion.highlighted).toEqual([]);

    await vi.waitFor(() =>
      httpTesting
        .expectOne('/api/holdings')
        .flush([...holdings, { ...holdings[0], id: 'h9', instrumentName: 'Newly added fund' }]),
    );

    await vi.waitFor(() => expect(motion.highlighted.length).toBeGreaterThan(0));
    expect(
      motion.highlighted.every((element) => element.closest('[data-holding-id="h9"], tr:has([data-holding-id="h9"])')),
    ).toBe(true);
  });

  it('reloads the list after the cash balance is set', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    await user.click(screen.getAllByTestId('edit-cash')[0]!);
    await user.type(screen.getByTestId('holding-cash-amount'), '500');
    await user.click(screen.getByTestId('holding-cash-submit'));

    await vi.waitFor(() =>
      httpTesting
        .expectOne((request) => request.method === 'PUT' && request.url.endsWith('/cash'))
        .flush(null, { status: 204, statusText: 'No Content' }),
    );
    await vi.waitFor(() => httpTesting.expectOne({ url: '/api/holdings', method: 'GET' }).flush(holdings));

    expect(await screen.findAllByText('Woodgrove Savings Plan')).not.toHaveLength(0);
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.balanceSaved');
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('a1');
  });

  it('closes the cash dialog when it is dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    await user.click(screen.getAllByTestId('edit-cash')[0]!);
    await user.click(await screen.findByTestId('holding-cash-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('holding-cash-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
    expect(TestBed.inject(HoldingChanges).lastTouched()).toBeNull();
  });

  it('should tell the user when holdings fail to load', async () => {
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
    httpTesting.expectOne('/api/holdings').flush('boom', { status: 500, statusText: 'Server error' });
    httpTesting.expectOne('/api/accounts').flush(accounts);

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.error');
  });

  it('should link each line to its detail screen', async () => {
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    const links = await screen.findAllByRole('link', { name: /FCPE Actions/ });

    for (const link of links) {
      expect(link).toHaveAttribute('href', '/holdings/h3');
    }
  });

  it('shows the icon add button on the iPhone and the filled one on desktop only', async () => {
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    expect(screen.getByTestId('add-holding').parentElement).toHaveClass('lg:hidden');
    expect(screen.getByTestId('add-holding-desktop').parentElement).toHaveClass('hidden', 'lg:block');
  });

  it('opens the add dialog from the mobile icon button too', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    await user.click(screen.getByTestId('add-holding'));

    expect(screen.getByTestId('holding-add-dialog')).toBeInTheDocument();

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(accounts));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
    await vi.waitFor(() =>
      httpTesting.expectOne((request) => request.url === '/api/holdings' && request.method === 'GET').flush([]),
    );
  });

  it('should show a skeleton while loading', async () => {
    const { fixture } = await render(TestHost, {
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

    await vi.waitFor(() => expect(fixture.nativeElement.querySelector('ui-skeleton')).toBeInTheDocument());
    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts);
  });

  it('should show the empty state when there is nothing to search through', async () => {
    await renderPage('/', []);

    expect(await screen.findByText('holdings.empty')).toBeInTheDocument();
  });

  it('opens the cash dialog from the mobile cash line', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    await user.click(screen.getAllByTestId('edit-cash-mobile')[0]!);

    expect(await screen.findByTestId('holding-cash-cancel')).toBeInTheDocument();
  });

  it('switches to the short placeholder below the desktop breakpoint', async () => {
    const queries = new Map<string, { matches: boolean; listeners: ((event: { matches: boolean }) => void)[] }>();
    vi.stubGlobal('matchMedia', (media: string) => {
      const query = queries.get(media) ?? { matches: false, listeners: [] };

      queries.set(media, query);

      return {
        get matches() {
          return query.matches;
        },
        addEventListener: (_: string, callback: (event: { matches: boolean }) => void) =>
          query.listeners.push(callback),
        removeEventListener: vi.fn(),
      };
    });
    await renderPage();
    await screen.findAllByText('Woodgrove Savings Plan');

    expect(screen.getByTestId('holdings-search')).toHaveAttribute('placeholder', 'holdings.searchPlaceholderShort');

    const desktop = queries.get('(min-width: 1024px)')!;
    desktop.matches = true;
    desktop.listeners.forEach((listener) => listener({ matches: true }));

    await vi.waitFor(() =>
      expect(screen.getByTestId('holdings-search')).toHaveAttribute('placeholder', 'holdings.searchPlaceholder'),
    );
  });

  it('ignores the old filter params', async () => {
    await renderPage('/?filter=stale&account=Woodgrove Savings Plan&assetClass=ETF');

    expect((await screen.findAllByText('Northwind PEA')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Woodgrove Savings Plan').length).toBeGreaterThan(0);
  });
});
