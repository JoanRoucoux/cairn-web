import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingDetailPage } from './holding-detail-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

@Component({ selector: 'app-stub-list', template: 'list' })
class StubList {}

const holding = {
  id: 'h1',
  instrumentId: 'i1',
  instrumentName: 'BNP Paribas Easy S&P 500',
  isin: 'FR0011550185',
  accountName: 'Saxo Investor',
  accountType: 'PEA',
  assetClass: 'ETF',
  quantity: 676,
  price: 33.3069,
  averageCost: 26.654,
  marketValueEur: 22515.47,
  unrealizedGainEur: 4497.36,
  unrealizedGainRatio: 0.1998,
  dayChangeEur: 142.8,
  dayChangeRatio: 0.0063,
  priceSource: 'YAHOO',
  priceAsOf: '2026-08-21',
  stale: false,
};

describe('HoldingDetailPage', () => {
  let httpTesting: HttpTestingController;

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  const renderPage = async (
    holdingId = 'h1',
    instrument: { description: string; externalUrl?: string } = {
      description: 'ETF tracking the S&P 500.',
      externalUrl: 'https://example.test/ese',
    },
    fixtureHolding: Record<string, unknown> = holding,
    translations = getTranslocoTestingModule(),
  ): Promise<HoldingDetailPage> => {
    const { fixture } = await render(TestHost, {
      imports: [translations],
      routes: [
        { path: 'holdings', component: StubList },
        { path: 'holdings/:holdingId', component: HoldingDetailPage, title: 'pageTitle.holdingDetail' },
      ],
      initialRoute: `holdings/${holdingId}`,
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
    httpTesting.expectOne('/api/holdings').flush([fixtureHolding]);
    await settle();
    httpTesting
      .match((request) => request.url === '/api/instruments/i1')
      .forEach((request) => request.flush(instrument));
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();

    return fixture.debugElement.query(By.directive(HoldingDetailPage)).componentInstance as HoldingDetailPage;
  };

  afterEach(() => httpTesting.verify());

  it('should name the holding', async () => {
    await renderPage();

    expect(await screen.findByRole('heading', { name: 'BNP Paribas Easy S&P 500' })).toBeInTheDocument();
  });

  it('should answer what the instrument is', async () => {
    await renderPage();

    expect(await screen.findByText('ETF tracking the S&P 500.')).toBeInTheDocument();
  });

  it('should translate the account type, asset class and price source instead of showing raw codes', async () => {
    await renderPage();

    await screen.findByRole('heading', { name: 'BNP Paribas Easy S&P 500' });
    expect(screen.getAllByText('enums.accountType.PEA', { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('enums.assetClass.ETF').length).toBeGreaterThan(0);
    expect(screen.getByText(/enums.priceSource.YAHOO/)).toBeInTheDocument();
  });

  it('shows the unrealized gain and the day change as amount and percent', async () => {
    await renderPage();

    await screen.findByRole('heading', { name: 'BNP Paribas Easy S&P 500' });
    expect(screen.getByText(/\+19\.98%/)).toBeInTheDocument();
    expect(screen.getByText(/\+0\.63%/)).toBeInTheDocument();
  });

  it('should link out to the provider factsheet in a new tab', async () => {
    await renderPage();

    const link = await screen.findByRole('link', { name: /holdings.externalLink/ });
    expect(link).toHaveAttribute('href', 'https://example.test/ese');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should not link out when the instrument has no external factsheet', async () => {
    await renderPage('h1', { description: 'Manually priced instrument.' });

    expect(screen.queryByRole('link', { name: /holdings.externalLink/ })).not.toBeInTheDocument();
  });

  it('should not present an empty chart or a blank last quote for a holding with no quote yet', async () => {
    await renderPage(
      'h1',
      { description: 'ETF tracking the S&P 500.' },
      { ...holding, price: null, priceCurrency: null, priceAsOf: null, marketValueEur: null },
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('no-quote-yet')).toBeInTheDocument();
  });

  it('should tell the user when the holding does not exist', async () => {
    await renderPage('nope');

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.notFound');
    expect(screen.getByTestId('holding-detail-back')).toHaveAttribute('href', '/holdings');
  });

  it('should ignore a request to price a holding that does not exist', async () => {
    const page = await renderPage('nope');

    page['onEnterQuote']();

    expect(screen.queryByTestId('manual-quote-dialog')).not.toBeInTheDocument();
  });

  it('should request new quotes when a range is picked', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'chart.range.max' }));

    await vi.waitFor(() => {
      const pending = httpTesting.match((request) => request.url.includes('/quotes'));
      expect(pending).toHaveLength(1);
      pending[0]?.flush([]);
    });
  });

  it('should open and dismiss the manual quote dialog', async () => {
    const user = userEvent.setup();
    await renderPage('h1', undefined, { ...holding, priceSource: 'MANUAL' });

    await user.click(await screen.findByTestId('enter-quote'));
    expect(screen.getByTestId('manual-quote-dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('manual-quote-cancel'));
    await vi.waitFor(() => expect(screen.queryByTestId('manual-quote-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
  });

  it('should reload the holding once a manual quote is saved', async () => {
    const user = userEvent.setup();
    const manualHolding = { ...holding, priceSource: 'MANUAL' };
    await renderPage('h1', undefined, manualHolding);

    await user.click(await screen.findByTestId('enter-quote'));
    await user.type(screen.getByTestId('manual-quote-price'), '33.3069');
    await user.click(screen.getByTestId('manual-quote-submit'));

    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/i1/quotes').flush({}));

    await vi.waitFor(() => expect(screen.queryByTestId('manual-quote-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('h1');
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.quoteSaved');
    httpTesting.expectOne('/api/holdings').flush([manualHolding]);
    await settle();
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();
  });

  it('should re-translate the range options when the active language changes', async () => {
    await renderPage(
      'h1',
      { description: 'ETF tracking the S&P 500.', externalUrl: 'https://example.test/ese' },
      holding,
      getTranslocoTestingModule({
        langs: { en: { 'chart.range.1d': '1D' }, fr: { 'chart.range.1d': '1J' } },
      }),
    );

    expect(await screen.findByRole('radio', { name: '1D' })).toBeInTheDocument();

    TestBed.inject(TranslocoService).setActiveLang('fr');
    TestBed.tick();

    expect(await screen.findByRole('radio', { name: '1J' })).toBeInTheDocument();
  });

  it('opens the edit dialog from the menu and reloads once saved', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('holding-menu-trigger-mobile'));
    await user.click(screen.getByTestId('holding-edit'));

    expect(screen.getByTestId('holding-edit-dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('holding-edit-submit'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush({ id: 'h1' });

    await vi.waitFor(() => expect(screen.queryByTestId('holding-edit-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('h1');
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.edited');
    httpTesting.expectOne('/api/holdings').flush([holding]);
    await settle();
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();
  });

  it('opens the delete dialog from the menu and returns to the list once deleted', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('holding-menu-trigger-mobile'));
    await user.click(screen.getByTestId('holding-delete'));
    await user.click(screen.getByTestId('holding-delete-confirm'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/holdings'));
    expect(TestBed.inject(HoldingChanges).lastRemoved()?.id).toBe('h1');
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.deleted');
  });

  it('opens the buy dialog and reloads once a purchase is saved', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('holding-buy-bar'));
    expect(screen.getByTestId('holding-buy-dialog')).toBeInTheDocument();

    await user.type(screen.getByTestId('holding-buy-quantity'), '40');
    await user.type(screen.getByTestId('holding-buy-price'), '29.1');
    await user.click(screen.getByTestId('holding-buy-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/buy'))).flush({ id: 'h1' });

    await vi.waitFor(() => expect(screen.queryByTestId('holding-buy-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('h1');
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.bought');
    httpTesting.expectOne('/api/holdings').flush([holding]);
    await settle();
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();
  });

  it('opens the buy and sell dialogs from the desktop inline actions too', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('holding-buy'));
    expect(screen.getByTestId('holding-buy-dialog')).toBeInTheDocument();
    screen.getByTestId('holding-buy-dialog').querySelector('dialog')?.close();
    await vi.waitFor(() => expect(screen.queryByTestId('holding-buy-dialog')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('holding-sell'));
    expect(screen.getByTestId('holding-sell-dialog')).toBeInTheDocument();
    screen.getByTestId('holding-sell-dialog').querySelector('dialog')?.close();
    await vi.waitFor(() => expect(screen.queryByTestId('holding-sell-dialog')).not.toBeInTheDocument());
  });

  it('closes the edit dialog without saving when dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('holding-menu-trigger-mobile'));
    await user.click(screen.getByTestId('holding-edit'));
    await user.click(screen.getByTestId('holding-edit-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('holding-edit-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
  });

  it('closes the delete dialog without deleting when dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('holding-menu-trigger-mobile'));
    await user.click(screen.getByTestId('holding-delete'));
    await user.click(screen.getByTestId('holding-delete-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('holding-delete-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
  });

  it('reloads after a partial sale, and returns to the list once the holding closes', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('holding-sell-bar'));
    await user.type(screen.getByTestId('holding-sell-quantity'), '100');
    await user.click(screen.getByTestId('holding-sell-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(
      { id: 'h1' },
      { status: 200, statusText: 'OK' },
    );

    await vi.waitFor(() => expect(screen.queryByTestId('holding-sell-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('h1');
    expect(TestBed.inject(HoldingChanges).lastRemoved()).toBeNull();
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.sold');
    TestBed.inject(UiToasts).dismiss();
    httpTesting.expectOne('/api/holdings').flush([holding]);
    await settle();
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();

    await user.click(screen.getByTestId('holding-sell-bar'));
    await user.click(screen.getByTestId('holding-sell-all'));
    await user.click(screen.getByTestId('holding-sell-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/holdings'));
    expect(TestBed.inject(HoldingChanges).lastRemoved()?.id).toBe('h1');
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.deleted');
  });

  it('hides Buy and Sell for a cash line', async () => {
    await renderPage('h1', { description: 'Cash.' }, { ...holding, assetClass: 'CASH' });

    expect(screen.queryByTestId('holding-buy-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('holding-sell-bar')).not.toBeInTheDocument();
  });

  it('draws no description block when the instrument has none', async () => {
    await renderPage('h1', { description: '', externalUrl: 'https://example.test/ese' });
    await screen.findByRole('heading', { name: 'BNP Paribas Easy S&P 500' });

    expect(screen.queryByText('ETF tracking the S&P 500.')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /holdings.externalLink/ })).not.toBeInTheDocument();
  });

  it('moves focus to the detail heading when a line opens', async () => {
    await renderPage();

    expect(await screen.findByRole('heading', { name: 'BNP Paribas Easy S&P 500' })).toHaveFocus();
  });

  it('offers the pencil and the trash icon in the menu', async () => {
    await renderPage();

    expect(await screen.findByTestId('holding-edit')).toContainElement(document.querySelector('svg.lucide-pencil'));
    expect(screen.getByTestId('holding-delete')).toContainElement(document.querySelector('svg.lucide-trash'));
  });

  it('links the back link to the holdings list', async () => {
    await renderPage();

    const back = await screen.findByText('holdings.detail.back');
    expect(back.closest('a')).toHaveAttribute('href', '/holdings');
  });
});
