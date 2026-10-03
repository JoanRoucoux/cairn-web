import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Event, NavigationEnd, Router, RouterOutlet, Scroll } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import type { Subject } from 'rxjs';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

@Component({ selector: 'app-stub-detail', template: 'detail' })
class StubDetail {}

const holdings = [
  {
    id: 'h1',
    accountId: 'a1',
    accountName: 'Northwind PEA',
    accountType: 'PEA',
    instrumentName: 'BNP Paribas Easy S&P 500',
    assetClass: 'ETF',
    quantity: 676,
    price: 33.3069,
    marketValueEur: 22515.47,
    stale: false,
  },
];

const accounts = [{ id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' }];

describe('HoldingListPage navigation motion', () => {
  let httpTesting: HttpTestingController;

  const open = async (): Promise<void> => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [
        { path: 'holdings', component: HoldingListPage, children: [{ path: ':holdingId', component: StubDetail }] },
      ],
      initialRoute: '/holdings',
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
    await screen.findAllByText('Northwind PEA');
  };

  const routerScrolls = (position: [number, number] | null): void =>
    (TestBed.inject(Router).events as Subject<Event>).next(
      new Scroll(new NavigationEnd(1, '/holdings', '/holdings'), position, null),
    );

  const scrolledTo = (): unknown[] => vi.mocked(window.scrollTo).mock.calls.map(([options]) => options);

  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 340 });
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'scrollY');
  });

  it('keeps the page where it was when a line opens beside the list', async () => {
    await open();

    await TestBed.inject(Router).navigateByUrl('/holdings/h1');
    routerScrolls(null);

    expect(scrolledTo()).toEqual([{ top: 340, behavior: 'instant' }]);
  });

  it('leaves a restored position to the router', async () => {
    await open();

    await TestBed.inject(Router).navigateByUrl('/holdings/h1');
    routerScrolls([0, 120]);

    expect(scrolledTo()).toEqual([]);
  });

  it('overlays the closing panel on the widened list, then hides the empty panel', async () => {
    await open();
    const panel = screen.getByRole('complementary');

    expect(panel).toHaveClass('lg:col-start-1');

    await TestBed.inject(Router).navigateByUrl('/holdings/h1');
    TestBed.tick();

    expect(panel).not.toHaveClass('lg:col-start-1');
    expect(panel).toHaveClass('not-has-[app-holding-detail-page]:hidden');
  });
});
