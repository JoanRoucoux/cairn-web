import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';

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

const livret = { id: 'a3', name: 'Livret A', type: 'SAVINGS', institution: 'Woodgrove Bank' };
const northwind = { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' };

describe('HoldingListPage balance query param', () => {
  let httpTesting: HttpTestingController;

  const open = async (initialRoute: string): Promise<void> => {
    await render(TestHost, {
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
    for (const request of httpTesting.match('/api/holdings')) {
      request.flush([]);
    }
    for (const request of httpTesting.match('/api/accounts')) {
      request.flush([northwind, livret]);
    }
  };

  afterEach(() => httpTesting.verify());

  it('opens the balance dialog of a savings account, then clears the param', async () => {
    await open('/?balance=a3');

    expect(await screen.findByTestId('holding-cash-dialog')).toHaveTextContent('holdings.balance.title');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    expect(screen.queryByText('holdings.cash.zeroHint')).not.toBeInTheDocument();
  });

  it('ignores a param that names no account, and clears it', async () => {
    await open('/?balance=nope');

    await screen.findAllByText('Livret A');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    expect(screen.queryByTestId('holding-cash-dialog')).not.toBeInTheDocument();
  });

  it('confirms a new savings balance, then highlights the balance row of that account', async () => {
    const motion = recordMotion();
    onTestFinished(() => motion.restore());
    const user = userEvent.setup();
    await open('/?balance=a3');

    await user.type(await screen.findByTestId('holding-cash-amount'), '1200');
    await user.click(screen.getByTestId('holding-cash-submit'));
    await vi.waitFor(() =>
      httpTesting
        .expectOne((request) => request.method === 'PUT' && request.url === '/api/accounts/a3/cash')
        .flush(null, { status: 204, statusText: 'No Content' }),
    );
    await vi.waitFor(() => expect(screen.queryByTestId('holding-cash-dialog')).not.toBeInTheDocument());

    expect(TestBed.inject(UiToasts).toast()?.text).toBe('holdings.toasts.balanceSaved');
    expect(TestBed.inject(HoldingChanges).lastTouched()?.id).toBe('a3');
    await vi.waitFor(() => httpTesting.expectOne({ url: '/api/holdings', method: 'GET' }).flush([]));

    await vi.waitFor(() => expect(motion.highlighted.length).toBeGreaterThan(0));
    expect(
      motion.highlighted.every((element) =>
        element.closest(
          '[data-account-id="a3"] [data-testid="cash-row"], [data-account-id="a3"] [data-testid="edit-cash-mobile"]',
        ),
      ),
    ).toBe(true);
  });
});
