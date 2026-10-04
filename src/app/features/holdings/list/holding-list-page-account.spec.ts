import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const accounts = [
  { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' },
  { id: 'a2', name: 'Woodgrove Savings Plan', type: 'PEE', institution: 'Woodgrove Bank' },
  { id: 'a3', name: 'Contoso Livret A', type: 'SAVINGS', institution: 'Contoso Bank' },
];

const line = (id: string, accountId: string, assetClass: string, name: string, value: number): unknown => ({
  id,
  accountId,
  accountName: accountId === 'a1' ? 'Northwind PEA' : 'Woodgrove Savings Plan',
  accountType: accountId === 'a1' ? 'PEA' : 'PEE',
  instrumentName: name,
  isin: `ISIN${id}`,
  assetClass,
  quantity: 1,
  price: value,
  marketValueEur: value,
  stale: false,
});

const holdings = [
  line('h1', 'a1', 'ETF', 'Amundi MSCI World', 1000),
  line('h2', 'a1', 'ETF', 'iShares Core S&P 500', 3000),
  line('h3', 'a2', 'FUND', 'FCPE Actions', 2000),
];

const translations = {
  en: { enums: { assetClass: { ETF: 'ETF', FUND: 'Funds', EQUITY: 'Stocks', CRYPTO: 'Crypto', CASH: 'Cash' } } },
  'holdings/en': {
    classFilter: { label: 'Filter by class', all: 'All' },
    accountFilter: { label: 'Account', all: 'All accounts', clear: 'Remove the account filter' },
    classSummary: {
      share_one: '· {{share}} of wealth, in {{count}} account',
      share_other: '· {{share}} of wealth, in {{count}} accounts',
    },
  },
};

describe('HoldingListPage account filter and folding', () => {
  let httpTesting: HttpTestingController;

  const open = async (initialRoute = '/'): Promise<void> => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule({ langs: { ...translations, fr: {}, 'holdings/fr': {} } })],
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
    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await screen.findAllByTestId('account-group');
  };

  const list = (): ReturnType<typeof within> => within(screen.getByTestId('holdings-list'));
  const pill = (): HTMLElement => screen.getByTestId('account-filter');
  const choice = (name: string): HTMLElement => screen.getByRole('menuitemradio', { name, hidden: true });
  const band = (name: string): HTMLElement =>
    within(document.querySelector('table')!).getByRole('button', { name: new RegExp(`^${name}`) });
  const url = (): string => TestBed.inject(Router).url;

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('the account pill', () => {
    it('should head the chips row outside the class group, at rest on every account', async () => {
      await open();
      const group = screen.getByRole('group', { name: 'Filter by class' });

      expect(group.contains(pill())).toBe(false);
      expect(pill().closest('ui-filter-chips')).not.toBeNull();
      expect(within(pill()).getByRole('button', { name: 'All accounts' })).toHaveAttribute('aria-haspopup', 'menu');
      expect(within(pill()).queryByRole('button', { name: 'Remove the account filter' })).not.toBeInTheDocument();
    });

    it('should offer every account after All accounts, the current one checked', async () => {
      await open();

      expect(screen.getAllByRole('menuitemradio', { hidden: true }).map((item) => item.textContent?.trim())).toEqual([
        'All accounts',
        'Northwind PEA',
        'Woodgrove Savings Plan',
        'Contoso Livret A',
      ]);
      expect(choice('All accounts')).toHaveAttribute('aria-checked', 'true');
      expect(choice('Northwind PEA')).toHaveAttribute('aria-checked', 'false');
    });

    it('should narrow the list to the chosen account, keep the chip counts global and name it on the pill', async () => {
      await open();

      fireEvent.click(choice('Woodgrove Savings Plan'));

      await vi.waitFor(() => expect(url()).toBe('/?compte=a2'));
      await vi.waitFor(() => expect(list().queryByText('Amundi MSCI World')).not.toBeInTheDocument());
      expect(list().getAllByText('FCPE Actions').length).toBeGreaterThan(0);
      expect(within(pill()).getByRole('button', { name: 'Account Woodgrove Savings Plan' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^All\s*6$/ })).toBeInTheDocument();
      expect(choice('Woodgrove Savings Plan')).toHaveAttribute('aria-checked', 'true');
    });

    it('should come back to every account with All accounts', async () => {
      await open('/?compte=a2');

      fireEvent.click(choice('All accounts'));

      await vi.waitFor(() => expect(url()).toBe('/'));
      expect(await list().findAllByText('Amundi MSCI World')).not.toHaveLength(0);
    });

    it('should clear the account with the cross and give the focus back to the pill', async () => {
      const user = userEvent.setup();
      await open('/?compte=a2');

      await user.click(within(pill()).getByRole('button', { name: 'Remove the account filter' }));

      await vi.waitFor(() => expect(url()).toBe('/'));
      expect(await list().findAllByText('Amundi MSCI World')).not.toHaveLength(0);
      expect(within(pill()).getByRole('button', { name: 'All accounts' })).toHaveFocus();
    });

    it('should open filtered from ?compte=, with nothing scrolled, highlighted or focused', async () => {
      const scrollIntoView = vi.fn();
      Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
      const animate = vi.spyOn(Element.prototype, 'animate');

      await open('/?compte=a2');

      expect(list().queryByText('Amundi MSCI World')).not.toBeInTheDocument();
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(animate).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(document.body);
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    });

    it('should combine the account with the class, the summary following the shown groups', async () => {
      await open('/?compte=a1&classe=etf');

      expect(await screen.findByTestId('class-summary')).toHaveTextContent('in 1 account');
      expect(list().queryByText('FCPE Actions')).not.toBeInTheDocument();
    });

    it('should drop an unknown account from the URL and list every account', async () => {
      await open('/?compte=nope');

      await vi.waitFor(() => expect(url()).toBe('/'));
      expect(list().getAllByText('FCPE Actions').length).toBeGreaterThan(0);
      expect(within(pill()).getByRole('button', { name: 'All accounts' })).toBeInTheDocument();
    });

    it('should prefill the chosen securities account in Ajouter une ligne, never a savings one', async () => {
      const user = userEvent.setup();
      await open('/?compte=a2');

      await user.click(screen.getByTestId('add-holding-desktop'));
      httpTesting.match('/api/holdings').forEach((request) => request.flush(holdings));
      httpTesting.match('/api/accounts').forEach((request) => request.flush(accounts));
      await user.click(await screen.findByTestId('holding-add-manual-link'));
      await user.type(screen.getByTestId('holding-add-manual-name'), 'Northwind Private Equity');
      await user.type(screen.getByTestId('holding-add-manual-price'), '100');

      await vi.waitFor(() => expect(screen.getByTestId('holding-add-account')).toHaveValue('a2'));
    });

    it('should not prefill a savings account', async () => {
      const user = userEvent.setup();
      await open('/?compte=a3');

      await user.click(screen.getByTestId('add-holding-desktop'));
      httpTesting.match('/api/holdings').forEach((request) => request.flush(holdings));
      httpTesting.match('/api/accounts').forEach((request) => request.flush(accounts));
      await user.click(await screen.findByTestId('holding-add-manual-link'));
      await user.type(screen.getByTestId('holding-add-manual-name'), 'Northwind Private Equity');
      await user.type(screen.getByTestId('holding-add-manual-price'), '100');

      await vi.waitFor(() => expect(screen.getByTestId('holding-add-account')).toHaveValue('a1'));
    });
  });

  describe('folding an account', () => {
    it('should fold a group on a click and remember it in localStorage', async () => {
      const user = userEvent.setup();
      await open();

      await user.click(band('Northwind PEA'));

      expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'false');
      expect(JSON.parse(localStorage.getItem('cairn-folded-accounts')!)).toEqual(['a1']);
      expect(screen.getAllByTestId('holding-row')[0]).toHaveAttribute('hidden');

      await user.click(band('Northwind PEA'));

      expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'true');
      expect(JSON.parse(localStorage.getItem('cairn-folded-accounts')!)).toEqual([]);
    });

    it('should come back folded, and prune the accounts that no longer exist', async () => {
      localStorage.setItem('cairn-folded-accounts', JSON.stringify(['a2', 'gone']));
      await open();

      expect(band('Woodgrove Savings Plan')).toHaveAttribute('aria-expanded', 'false');
      expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'true');
      expect(JSON.parse(localStorage.getItem('cairn-folded-accounts')!)).toEqual(['a2']);
    });

    it('should reopen everything under a search, lock the headers and keep the memory', async () => {
      const user = userEvent.setup();
      localStorage.setItem('cairn-folded-accounts', JSON.stringify(['a1']));
      await open();

      await user.type(screen.getByTestId('holdings-search'), 'amundi');

      expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'true');
      expect(band('Northwind PEA')).toHaveAttribute('aria-disabled', 'true');
      await user.click(band('Northwind PEA'));
      expect(JSON.parse(localStorage.getItem('cairn-folded-accounts')!)).toEqual(['a1']);

      await user.clear(screen.getByTestId('holdings-search'));

      expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'false');
    });

    it('should hold the filtered account open, and every group under a class', async () => {
      localStorage.setItem('cairn-folded-accounts', JSON.stringify(['a1', 'a2']));
      await open('/?compte=a1');

      expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(choice('All accounts'));
      await vi.waitFor(() => expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'false'));

      await userEvent.setup().click(screen.getByRole('button', { name: /^ETF/ }));
      await vi.waitFor(() => expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'true'));
    });

    it('should forget nothing when the storage holds garbage', async () => {
      localStorage.setItem('cairn-folded-accounts', '{oops');
      await open();

      expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'true');
    });

    it('should fold the iPhone card the same way', async () => {
      const user = userEvent.setup();
      await open();
      const card = screen.getAllByTestId('account-card')[0]!;

      await user.click(within(card).getByRole('button', { name: /^Northwind PEA/ }));

      expect(within(card).getByRole('button', { name: /^Northwind PEA/ })).toHaveAttribute('aria-expanded', 'false');
      expect(card.querySelector('ui-card')).toHaveAttribute('hidden');
      expect(band('Northwind PEA')).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
