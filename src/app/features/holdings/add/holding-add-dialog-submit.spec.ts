import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { fireEvent, render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingAddDialog } from './holding-add-dialog';

const accounts = [{ id: 'a1', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' }];
const instruments = [
  {
    id: 'i1',
    name: 'Amundi MSCI World',
    isin: 'LU1681043599',
    currency: 'EUR',
    assetClass: 'ETF',
    priceSource: 'YAHOO',
  },
];

describe('HoldingAddDialog results and submit', () => {
  let httpTesting: HttpTestingController;
  const saved = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (
    presetAccountId: string | null = null,
    catalog: unknown[] = instruments,
  ): Promise<void> => {
    await render(HoldingAddDialog, {
      inputs: { presetAccountId },
      on: { saved, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/instruments').flush(catalog);
    httpTesting.expectOne('/api/holdings').flush([]);
  };

  afterEach(() => {
    httpTesting.verify();
    saved.mockClear();
    dismissed.mockClear();
  });

  it('lists the catalogue results by name, accents and case ignored, before capping them at four', async () => {
    const user = userEvent.setup();
    const named = ['Zalando MSCI', 'édenred MSCI', 'Accor MSCI', 'Bouygues MSCI', 'Danone MSCI', 'Air MSCI'].map(
      (name, index) => ({ ...instruments[0], id: 'n' + index, name, isin: 'FR000000000' + index }),
    );
    await renderDialog(null, named);

    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
    const names = (await screen.findAllByTestId('holding-add-catalog-candidate')).map((row) =>
      row.querySelector('span span')?.textContent?.trim(),
    );

    expect(names).toEqual(['Accor MSCI', 'Air MSCI', 'Bouygues MSCI', 'Danone MSCI']);
  });

  it('submits the form once the line is valid', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
    await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    fireEvent.submit(screen.getByTestId('holding-add-quantity').closest('form') as HTMLFormElement);

    (await vi.waitFor(() => httpTesting.expectOne((request) => request.method === 'POST'))).flush({});
    await vi.waitFor(() => expect(saved).toHaveBeenCalled());
  });

  it('does not submit the form while the line is incomplete', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    fireEvent.submit(screen.getByTestId('holding-add-query').closest('form') as HTMLFormElement);
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));

    httpTesting.expectNone((request) => request.method === 'POST' && request.url === '/api/holdings');
  });
});
