import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen, within } from '@testing-library/angular';

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
  {
    id: 'h2',
    accountId: 'a2',
    accountName: 'Contoso Trading',
    accountType: 'CTO',
    instrumentName: 'Woodgrove Industries',
    assetClass: 'EQUITY',
    quantity: 10,
    price: 50,
    marketValueEur: 500,
    stale: false,
  },
];

const accounts = [
  { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' },
  { id: 'a2', name: 'Contoso Trading', type: 'CTO', institution: 'Contoso Bank' },
];

describe('HoldingListPage focus', () => {
  let httpTesting: HttpTestingController;

  const closeDetail = async (
    visible: 'card' | 'table' | 'none',
    removed: 'none' | 'own' | 'other' | 'list' = 'none',
  ): Promise<HTMLElement> => {
    const { fixture } = await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: '', component: HoldingListPage, children: [{ path: ':holdingId', component: StubDetail }] }],
      initialRoute: '/h1',
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
    await screen.findByText('detail');

    const host: HTMLElement = fixture.nativeElement;
    const shown = host.querySelector<HTMLElement>(
      visible === 'table' ? 'table [data-holding-id]' : '[data-testid="holding-row-mobile"]',
    )!;

    if (visible !== 'none') {
      Object.defineProperty(shown, 'offsetParent', { value: host });
    }

    if (removed !== 'none') {
      const band = removed === 'own' ? 'a1' : 'a2';

      if (removed !== 'list') {
        const heading = host.querySelector<HTMLElement>(`table [data-account-id="${band}"] h2 button`)!;

        Object.defineProperty(heading, 'offsetParent', { value: host });
      }
      TestBed.inject(HoldingChanges).removed('h1');
    }

    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    TestBed.tick();

    return shown;
  };

  afterEach(() => httpTesting.verify());

  it('returns focus to the iPhone card row of the closed line when the table is hidden', async () => {
    const card = await closeDetail('card');

    expect(card).toHaveFocus();
    expect(card).toHaveAttribute('data-holding-id', 'h1');
  });

  it('returns focus to the table row link when it is the visible one', async () => {
    expect(await closeDetail('table')).toHaveFocus();
  });

  const reloaded = async (left: unknown[]): Promise<void> => {
    httpTesting.expectOne('/api/holdings').flush(left);
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    TestBed.tick();
  };

  const band = (name: RegExp): HTMLElement => within(document.querySelector('table')!).getByRole('button', { name });

  it('moves focus to the band of its account once the closed line was deleted or sold out', async () => {
    const row = await closeDetail('table', 'own');

    expect(band(/^Northwind PEA/)).not.toHaveFocus();

    await reloaded(holdings);

    await vi.waitFor(() => expect(band(/^Northwind PEA/)).toHaveFocus());
    expect(row).not.toHaveFocus();
  });

  it('waits for the reload, then moves focus to the next band when its own group emptied', async () => {
    await closeDetail('table', 'other');

    await reloaded([holdings[1]]);

    await vi.waitFor(() => expect(band(/^Contoso Trading/)).toHaveFocus());
  });

  it('moves focus to the search field once no band is left', async () => {
    await closeDetail('table', 'list');

    await reloaded([]);

    await vi.waitFor(() => expect(screen.getByTestId('holdings-search')).toHaveFocus());
  });

  it('leaves focus alone when no row of the closed line is rendered', async () => {
    expect(await closeDetail('none')).not.toHaveFocus();
  });
});
