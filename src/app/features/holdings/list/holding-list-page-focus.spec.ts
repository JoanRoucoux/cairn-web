import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';

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
    accountName: 'Saxo Investor',
    accountType: 'PEA',
    instrumentName: 'BNP Paribas Easy S&P 500',
    assetClass: 'ETF',
    quantity: 676,
    price: 33.3069,
    marketValueEur: 22515.47,
    stale: false,
  },
];

const accounts = [{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' }];

describe('HoldingListPage focus', () => {
  let httpTesting: HttpTestingController;

  const closeDetail = async (visible: 'card' | 'table' | 'none'): Promise<HTMLElement> => {
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

  it('leaves focus alone when no row of the closed line is rendered', async () => {
    expect(await closeDetail('none')).not.toHaveFocus();
  });
});
