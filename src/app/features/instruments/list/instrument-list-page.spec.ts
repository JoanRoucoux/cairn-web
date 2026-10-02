import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type Provider, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui';
import { TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { delayedScopeLoader, getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { InstrumentListPage } from './instrument-list-page';
import { InstrumentListStore } from './instrument-list-store';

const instrument = {
  id: 'i1',
  name: 'BNP Paribas Easy S&P 500',
  isin: 'FR0011550185',
  assetClass: 'ETF',
  priceSource: 'YAHOO',
  sourceRef: 'ESE.PA',
};

describe('InstrumentListPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (extraProviders: Provider[] = []): Promise<void> => {
    await render(InstrumentListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslocoScope('instruments'),
        InstrumentListStore,
        ...extraProviders,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  const flushOne = async (instruments: unknown[] = [instrument], holdings: unknown[] = []): Promise<void> => {
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush(instruments));
    await vi.waitFor(() => httpTesting.expectOne('/api/holdings').flush(holdings));
  };

  afterEach(() => httpTesting.verify());

  it('does not translate its instruments scope keys before the scope has loaded', async () => {
    const translate = vi.spyOn(TranslocoService.prototype, 'translate');
    await renderPage([delayedScopeLoader()]);
    await flushOne();

    expect(translate.mock.calls.filter(([key]) => String(key).startsWith('instruments.count'))).toEqual([]);

    translate.mockRestore();
  });

  it('should list the instruments the server returns', async () => {
    await renderPage();
    await flushOne();

    expect(await screen.findAllByTestId('instrument-row')).toHaveLength(1);
  });

  it('names the asset class and the price source through a translation key, and shows the source reference', async () => {
    await renderPage();
    await flushOne();
    await screen.findAllByTestId('instrument-row');

    expect(screen.getAllByText('enums.assetClass.ETF').length).toBeGreaterThan(0);
    expect(screen.getAllByText('enums.priceSource.YAHOO').length).toBeGreaterThan(0);
    expect(screen.getByText('ESE.PA')).toBeInTheDocument();
  });

  it('mutes a manually priced instrument', async () => {
    await renderPage();
    await flushOne([{ ...instrument, priceSource: 'MANUAL', sourceRef: null }]);

    expect((await screen.findAllByText('enums.priceSource.MANUAL'))[0]).toHaveClass('text-(--muted-foreground)');
    expect(screen.getByText('instruments.manualCaption')).toBeInTheDocument();
  });

  it('shows the holding count, or "Aucune" for an instrument no line uses', async () => {
    await renderPage();
    await flushOne([instrument], [{ id: 'h1', instrumentId: 'i1' }]);

    expect(await screen.findByTestId('instrument-row')).toHaveTextContent('1');
  });

  it('shows none for an instrument with no line', async () => {
    await renderPage();
    await flushOne();

    expect(await screen.findByText('instruments.noLines')).toBeInTheDocument();
    expect(screen.getByText('instruments.noLinesFull')).toBeInTheDocument();
  });

  it('should filter the instruments by name or isin', async () => {
    const user = userEvent.setup();
    await renderPage();
    await flushOne([
      instrument,
      { id: 'i2', name: 'Bitcoin', isin: null, assetClass: 'CRYPTO', priceSource: 'COINGECKO' },
    ]);

    await user.type(screen.getByTestId('instruments-search'), 'bitcoin');

    expect(await screen.findAllByTestId('instrument-row')).toHaveLength(1);
    expect(screen.getAllByText('Bitcoin').length).toBeGreaterThan(0);
  });

  it('shows one line, no hint and no button for an empty catalogue', async () => {
    await renderPage();
    await flushOne([]);

    expect(await screen.findByText('instruments.empty')).toBeInTheDocument();
    expect(screen.queryByText('instruments.noMatchHint')).not.toBeInTheDocument();
    expect(screen.queryByTestId('instruments-add-line')).not.toBeInTheDocument();
    expect(screen.getAllByText('instruments.count_other').length).toBeGreaterThan(0);
  });

  it('keeps the plain count and the one line of an empty catalogue while a search is typed', async () => {
    const user = userEvent.setup();
    await renderPage();
    await flushOne([]);

    await user.type(screen.getByTestId('instruments-search'), 'zzz');

    expect(await screen.findByText('instruments.empty')).toBeInTheDocument();
    expect(screen.getAllByText('instruments.count_other').length).toBeGreaterThan(0);
    expect(screen.queryByText('instruments.countOf_other')).not.toBeInTheDocument();
  });

  it('shows the empty state with the search, the hint and an add button when nothing matches', async () => {
    const user = userEvent.setup();
    await renderPage();
    await flushOne();

    await user.type(screen.getByTestId('instruments-search'), ' zzz ');

    expect(await screen.findByText('instruments.noMatch')).toBeInTheDocument();
    expect(screen.getByText('instruments.noMatchHint')).toBeInTheDocument();
    expect(screen.getAllByText('instruments.countOf_one').length).toBeGreaterThan(0);
    expect(screen.queryByText('instruments.empty')).not.toBeInTheDocument();
  });

  it('opens the holdings add dialog with the search from the no-match button', async () => {
    const user = userEvent.setup();
    await renderPage();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await flushOne();

    await user.type(screen.getByTestId('instruments-search'), 'zzz');
    await user.click(await screen.findByTestId('instruments-add-line'));

    expect(navigate).toHaveBeenCalledWith(['/holdings'], { queryParams: { add: '', q: 'zzz' } });
  });

  it('counts the shown rows against the whole catalogue while searching', async () => {
    const user = userEvent.setup();
    await renderPage();
    await flushOne([
      instrument,
      { id: 'i2', name: 'Bitcoin', isin: null, assetClass: 'CRYPTO', priceSource: 'COINGECKO' },
    ]);

    expect((await screen.findAllByText('instruments.count_other')).length).toBeGreaterThan(0);

    await user.type(screen.getByTestId('instruments-search'), 'bitcoin');

    expect(screen.getAllByText('instruments.countOf_other').length).toBeGreaterThan(0);
    expect(screen.queryByText('instruments.count_other')).not.toBeInTheDocument();
  });

  it('tells the reader what the search box searches', async () => {
    await renderPage();

    expect(screen.getByRole('searchbox', { name: 'instruments.searchLabel' })).toHaveAttribute(
      'placeholder',
      'instruments.searchPlaceholder',
    );

    await flushOne([]);
  });

  it('should link each row to the instrument edit screen', async () => {
    await renderPage();
    await flushOne();

    expect(await screen.findByTestId('instrument-row-mobile')).toHaveAttribute('href', '/instruments/i1');
  });

  it('navigates to the edit screen from the row menu', async () => {
    const user = userEvent.setup();
    await renderPage();
    await flushOne();
    await screen.findAllByTestId('instrument-row');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    await user.click(screen.getByTestId('instrument-menu-trigger'));
    await user.click(screen.getByTestId('instrument-menu-edit'));

    expect(navigate).toHaveBeenCalledWith(['/instruments', 'i1']);
  });

  it('opens the delete dialog from the row menu', async () => {
    const user = userEvent.setup();
    await renderPage();
    await flushOne();
    await screen.findAllByTestId('instrument-row');

    await user.click(screen.getByTestId('instrument-menu-trigger'));
    await user.click(screen.getByTestId('instrument-menu-delete'));

    expect(screen.getByTestId('instrument-delete-dialog')).toBeInTheDocument();
  });

  it('closes the delete dialog without deleting when dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();
    await flushOne();
    await screen.findAllByTestId('instrument-row');

    await user.click(screen.getByTestId('instrument-menu-trigger'));
    await user.click(screen.getByTestId('instrument-menu-delete'));
    await user.click(screen.getByTestId('instrument-delete-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('instrument-delete-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
  });

  it('reloads the list once an instrument is deleted', async () => {
    const user = userEvent.setup();
    await renderPage();
    await flushOne();
    await screen.findAllByTestId('instrument-row');

    await user.click(screen.getByTestId('instrument-menu-trigger'));
    await user.click(screen.getByTestId('instrument-menu-delete'));
    await user.click(screen.getByTestId('instrument-delete-confirm'));

    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/i1').flush(null));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([]));
    await vi.waitFor(() => httpTesting.expectOne('/api/holdings').flush([]));

    expect(await screen.findByText('instruments.empty')).toBeInTheDocument();
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('instruments.toasts.deleted');
  });

  it('shows the back link to the profile and the instrument count, and a dash for a missing ISIN', async () => {
    await renderPage();
    await flushOne([
      instrument,
      { id: 'i2', name: 'Bitcoin', isin: null, assetClass: 'CRYPTO', priceSource: 'COINGECKO' },
    ]);

    expect(await screen.findByTestId('instruments-back')).toHaveAttribute('href', '/profile');
    expect(screen.getAllByText('instruments.count_other').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('instrument-row')[0]).toHaveTextContent('—');
  });

  it('shows a count skeleton while loading', async () => {
    await renderPage();

    expect(screen.queryByTestId('instruments-count-skeleton')).not.toBeInTheDocument();
    expect(await screen.findByTestId('instruments-count-skeleton')).toBeInTheDocument();

    await flushOne([]);
  });

  it('shows the symbol in the ISIN or symbol column for an instrument without ISIN', async () => {
    await renderPage();
    await flushOne([
      { id: 'i2', name: 'Bitcoin', isin: null, symbol: 'BTC', assetClass: 'CRYPTO', priceSource: 'COINGECKO' },
    ]);

    expect((await screen.findByTestId('instrument-row')).querySelectorAll('td')[1]).toHaveTextContent('BTC');
  });

  it('lists the instruments alphabetically', async () => {
    await renderPage();
    await flushOne([
      { ...instrument, id: 'z', name: 'Zalando' },
      { ...instrument, id: 'e', name: 'Édenred' },
      { ...instrument, id: 'a', name: 'Accor' },
    ]);

    const rows = await screen.findAllByTestId('instrument-row');

    expect(rows.map((row) => row.querySelector('td')?.textContent?.trim())).toEqual(['Accor', 'Édenred', 'Zalando']);
  });

  it('uses the long search placeholder on a desktop viewport', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    await renderPage();

    expect(screen.getByTestId('instruments-search')).toHaveAttribute(
      'placeholder',
      'instruments.searchPlaceholderDesktop',
    );

    vi.unstubAllGlobals();
    await flushOne([]);
  });

  it('should show an error when instruments cannot load', async () => {
    await renderPage();

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/instruments').flush(null, { status: 500, statusText: 'Server Error' }),
    );
    httpTesting.expectOne('/api/holdings').flush([]);

    expect(await screen.findByText('instruments.errorTitle')).toBeInTheDocument();
  });

  it('reloads both calls from the error block retry', async () => {
    const user = userEvent.setup();
    await renderPage();
    await vi.waitFor(() =>
      httpTesting.expectOne('/api/instruments').flush(null, { status: 500, statusText: 'Server Error' }),
    );
    httpTesting.expectOne('/api/holdings').flush([]);

    await user.click(await screen.findByRole('button', { name: 'instruments.retry' }));

    await flushOne();
    expect(await screen.findAllByTestId('instrument-row')).toHaveLength(1);
  });

  it('follows the viewport width for the search placeholder', async () => {
    const query = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', () => query);
    await renderPage();

    expect(screen.getByTestId('instruments-search')).toHaveAttribute('placeholder', 'instruments.searchPlaceholder');

    query.matches = true;
    query.dispatchEvent(new Event('change'));

    await vi.waitFor(() =>
      expect(screen.getByTestId('instruments-search')).toHaveAttribute(
        'placeholder',
        'instruments.searchPlaceholderDesktop',
      ),
    );

    vi.unstubAllGlobals();
    await flushOne([]);
  });

  it('falls back to the short placeholder where the browser has no media queries', async () => {
    vi.stubGlobal('matchMedia', undefined);
    await renderPage();

    expect(screen.getByTestId('instruments-search')).toHaveAttribute('placeholder', 'instruments.searchPlaceholder');

    vi.unstubAllGlobals();
    await flushOne([]);
  });
});
