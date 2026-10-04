import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen, within } from '@testing-library/angular';

import { RatioPipe } from '@shared/format/ratio-pipe';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingListPage } from './holding-list-page';

@Component({ selector: 'app-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class TestHost {}

const accounts = [{ id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' }];

const line = (id: string, assetClass: string): unknown => ({
  id,
  accountId: 'a1',
  accountName: 'Northwind PEA',
  accountType: 'PEA',
  instrumentId: `i${id}`,
  instrumentName: `Line ${id}`,
  assetClass,
  priceSource: 'MANUAL',
  quantity: 1,
  price: 100,
  marketValueEur: 100,
  stale: false,
});

describe('HoldingListPage held-only class chips', () => {
  let httpTesting: HttpTestingController;

  const open = async (holdings: unknown[], initialRoute = '/'): Promise<string[]> => {
    await render(TestHost, {
      imports: [getTranslocoTestingModule()],
      routes: [{ path: '', component: HoldingListPage }],
      initialRoute,
      providers: [
        HoldingChanges,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        RatioPipe,
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush(holdings);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    await screen.findByRole('button', { name: /^holdings.classFilter.all\s+\d+$/ });
    const chips = within(await screen.findByRole('group', { name: 'holdings.classFilter.label' })).getAllByRole(
      'button',
    );

    return chips.map((chip) => chip.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  };

  afterEach(() => httpTesting.verify());

  it('hides Obligations and Autre while no line has them', async () => {
    expect(await open([line('1', 'ETF')])).toEqual([
      'holdings.classFilter.all 2',
      'enums.assetClass.ETF 1',
      'enums.assetClass.FUND 0',
      'enums.assetClass.EQUITY 0',
      'enums.assetClass.CRYPTO 0',
      'enums.assetClass.CASH 1',
    ]);
  });

  it('shows Obligations and Autre after Crypto once a line has them', async () => {
    const chips = await open([line('1', 'BOND'), line('2', 'OTHER')]);

    expect(chips.slice(4)).toEqual([
      'enums.assetClass.CRYPTO 0',
      'enums.assetClass.BOND 1',
      'enums.assetClass.OTHER 1',
      'enums.assetClass.CASH 1',
    ]);
  });

  it('keeps the chip of a class chosen from the URL even when no line has it', async () => {
    const chips = await open([line('1', 'ETF')], '/?classe=obligations');

    expect(chips).toContain('enums.assetClass.BOND 0');
    expect(chips).not.toContain('enums.assetClass.OTHER 0');
  });
});
