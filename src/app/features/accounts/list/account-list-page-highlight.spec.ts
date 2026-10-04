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

  beforeEach(() => (motion = recordMotion()));

  afterEach(() => {
    motion.restore();
    httpTesting.verify();
  });

  it('should highlight the account just added once the list comes back', async () => {
    const user = userEvent.setup();
    await renderPage([northwind], []);

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

    await vi.waitFor(() => expect(motion.highlighted.length).toBeGreaterThan(0));
    expect(motion.highlighted.every((element) => element.closest('tr, a')?.textContent?.includes('Livret A'))).toBe(
      true,
    );
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
