import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { type MotionRecord, recordMotion } from '@shared/testing/motion';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AccountListPage } from './account-list-page';
import { AccountListStore } from './account-list-store';

const northwind = { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' };
const livretA = { id: 'a2', name: 'Livret A', type: 'SAVINGS', institution: 'Woodgrove Bank' };

describe('AccountListPage highlight', () => {
  let httpTesting: HttpTestingController;
  let motion: MotionRecord;

  const renderPage = async (accounts: unknown[], holdings: unknown[]): Promise<void> => {
    await render(AccountListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        provideTranslocoScope('accounts'),
        AccountListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting
      .expectOne('/api/portfolio')
      .flush({ totalEur: 0, unvaluedCount: 0, nonEurCount: 0, byAssetClass: [], byAccount: [], holdings });
  };

  beforeEach(() => {
    motion = recordMotion();
  });

  afterEach(() => {
    motion.restore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    httpTesting.verify();
  });

  const addLivretA = async (): Promise<void> => {
    const user = userEvent.setup();
    await user.click(screen.getByTestId('account-add'));
    await user.type(screen.getByTestId('account-form-name'), 'Livret A');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.SAVINGS' }));
    await user.click(screen.getByTestId('account-form-submit'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(livretA));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/accounts'))
      .then((request) => request.flush([northwind, livretA]));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));
  };

  const confirmations = (): Element[][] => {
    const highlightedWhenConfirmed: Element[][] = [];
    vi.spyOn(TestBed.inject(UiToasts), 'show').mockImplementation(() => {
      highlightedWhenConfirmed.push([...motion.highlighted]);
    });
    return highlightedWhenConfirmed;
  };

  it('should highlight the account just added, and confirm it once the phone row flashes', async () => {
    await renderPage([northwind], []);
    const confirmed = confirmations();

    await addLivretA();

    await vi.waitFor(() => expect(confirmed).toHaveLength(1));
    expect(confirmed[0]).toContain(
      screen.getAllByTestId('account-link-mobile').find((link) => link.textContent?.includes('Livret A')),
    );
    await vi.waitFor(() => expect(motion.highlighted.length).toBeGreaterThan(1));
    expect(motion.highlighted.every((element) => element.closest('tr, a')?.textContent?.includes('Livret A'))).toBe(
      true,
    );
    expect(confirmed).toHaveLength(1);
  });

  it('should confirm the account just added once the desktop row flashes', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    await renderPage([northwind], []);
    const confirmed = confirmations();

    await addLivretA();

    await vi.waitFor(() => expect(confirmed).toHaveLength(1));
    const row = screen.getAllByTestId('account-row').find((element) => element.textContent?.includes('Livret A'))!;
    expect(confirmed[0]!.some((element) => row.contains(element))).toBe(true);
  });

  it('should hold the confirmation until the list has reloaded', async () => {
    const user = userEvent.setup();
    await renderPage([northwind], []);

    await user.click(screen.getByTestId('account-add'));
    await user.type(screen.getByTestId('account-form-name'), 'Livret A');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.SAVINGS' }));
    await user.click(screen.getByTestId('account-form-submit'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(livretA));
    const reload = await vi.waitFor(() => httpTesting.expectOne('/api/accounts'));

    expect(TestBed.inject(UiToasts).toast()).toBeNull();

    reload.flush([northwind, livretA]);
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));

    await vi.waitFor(() => expect(TestBed.inject(UiToasts).toast()?.text).toBe('accounts.toasts.created'));
  });

  it('should still confirm the new account when the list fails to reload', async () => {
    const user = userEvent.setup();
    await renderPage([northwind], []);

    await user.click(screen.getByTestId('account-add'));
    await user.type(screen.getByTestId('account-form-name'), 'Livret A');
    await user.click(screen.getByRole('radio', { name: 'enums.accountType.SAVINGS' }));
    await user.click(screen.getByTestId('account-form-submit'));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush(livretA));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/accounts'))
      .then((request) => request.flush(null, { status: 500, statusText: 'Server Error' }));
    httpTesting
      .match('/api/portfolio')
      .forEach((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));

    await vi.waitFor(() => expect(TestBed.inject(UiToasts).toast()?.text).toBe('accounts.toasts.created'));
  });

  it('should not highlight an account that was only edited', async () => {
    const user = userEvent.setup();
    await renderPage([northwind], []);

    await user.click(await screen.findByTestId('account-menu-trigger'));
    await user.click(screen.getByTestId('account-edit'));
    await user.click(await screen.findByTestId('account-form-submit'));

    await vi.waitFor(() => httpTesting.expectOne('/api/accounts/a1').flush(northwind));
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts')).then((request) => request.flush([northwind]));
    await vi
      .waitFor(() => httpTesting.expectOne('/api/portfolio'))
      .then((request) => request.flush({ byAssetClass: [], byAccount: [], holdings: [] }));

    await vi.waitFor(() => expect(TestBed.inject(UiToasts).toast()).not.toBeNull());
    expect(motion.highlighted).toEqual([]);
  });
});
