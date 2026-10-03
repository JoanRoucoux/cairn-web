import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { slowDialogExit } from '@shared/testing/dialog-exit';
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
  accountName: 'Northwind PEA',
  accountType: 'PEA',
  assetClass: 'ETF',
  quantity: 676,
  price: 33.3069,
  marketValueEur: 22515.47,
  stale: false,
};

describe('HoldingDetailPage during the exit of a dialog', () => {
  let httpTesting: HttpTestingController;

  const settle = async (): Promise<void> => {
    for (let i = 0; i < 10; i++) {
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  const flushDetail = async (): Promise<void> => {
    await settle();
    httpTesting.match((request) => request.url === '/api/instruments/i1').forEach((request) => request.flush({}));
    httpTesting.match((request) => request.url.includes('/quotes')).forEach((request) => request.flush([]));
    await settle();
  };

  beforeEach(async () => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [
        { path: 'holdings', component: StubList },
        { path: 'holdings/:holdingId', component: HoldingDetailPage },
      ],
      initialRoute: 'holdings/h1',
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
    httpTesting.expectOne('/api/holdings').flush([holding, { ...holding, id: 'h2' }]);
    await flushDetail();
  });

  afterEach(() => httpTesting.verify());

  const leaveForAnotherLineDuring = async (): Promise<void> => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/holdings/h2');
    await vi.waitFor(() => expect(TestBed.inject(UiToasts).toast()).not.toBeNull());
    await flushDetail();

    expect(router.url).toBe('/holdings/h2');
  };

  it('stays on the line the reader opened while a delete played its exit', async () => {
    const user = userEvent.setup();

    await user.click(screen.getByTestId('holding-menu-trigger-mobile'));
    await user.click(screen.getByTestId('holding-delete'));
    slowDialogExit(400);
    await user.click(screen.getByTestId('holding-delete-confirm'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await leaveForAnotherLineDuring();
  });

  it('stays on the line the reader opened while a sell-all played its exit', async () => {
    const user = userEvent.setup();

    await user.click(screen.getByTestId('holding-sell-bar'));
    await user.click(screen.getByTestId('holding-sell-all'));
    slowDialogExit(400);
    await user.click(screen.getByTestId('holding-sell-submit'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1/sell'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await leaveForAnotherLineDuring();
  });
});
