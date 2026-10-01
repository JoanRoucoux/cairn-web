import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
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

describe('HoldingAddDialog', () => {
  let httpTesting: HttpTestingController;
  const saved = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (presetAccountId?: string): Promise<void> => {
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
    httpTesting.expectOne('/api/instruments').flush(instruments);
  };

  afterEach(() => {
    httpTesting.verify();
    saved.mockClear();
    dismissed.mockClear();
  });

  it('preselects the preset account', async () => {
    await renderDialog('a1');

    await vi.waitFor(() => expect(screen.getByTestId('holding-add-account')).toHaveValue('a1'));
  });

  it('shows the catalogue hit for a local match', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'msci');

    expect(await screen.findByTestId('holding-add-catalog-candidate')).toHaveTextContent('Amundi MSCI World');

    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
  });

  it('picks a catalogue instrument and shows the quantity and cost fields', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    await user.click(await screen.findByTestId('holding-add-catalog-candidate'));

    expect(screen.getByTestId('holding-add-quantity')).toBeInTheDocument();
    expect(screen.queryByText('holdings.add.newBadge')).not.toBeInTheDocument();

    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
  });

  it('shows an online candidate with its badge and live value once picked', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'ishares world');
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
      {
        name: 'iShares Core MSCI World',
        source: 'YAHOO',
        sourceRef: 'EUNL.DE',
        assetClass: 'ETF',
        exchange: 'Xetra',
        probePrice: 97.84,
      },
    ]);

    await user.click(await screen.findByTestId('holding-add-online-candidate'));
    expect(screen.getByText('holdings.add.newBadge')).toBeInTheDocument();
    expect(screen.getByText(/newNote/)).toBeInTheDocument();

    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    expect(await screen.findByTestId('holding-add-value-at-probe')).toHaveTextContent('€978.40');
  });

  it('shows the online error with its own retry, keeping the catalogue results', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    expect(await screen.findByText('holdings.add.onlineError')).toBeInTheDocument();
    expect(screen.getByTestId('holding-add-catalog-candidate')).toBeInTheDocument();

    await user.click(screen.getByTestId('holding-add-online-retry'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([]);
  });

  it('offers to create a manual instrument when nothing is found', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'zzz');
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([]);

    await user.click(await screen.findByTestId('holding-add-create-manual'));
    expect(screen.getByTestId('holding-add-quantity')).toBeInTheDocument();
    expect(screen.getByText('holdings.add.newBadge')).toBeInTheDocument();
  });

  it('lets Change return to the search', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));

    await user.click(screen.getByTestId('holding-add-change'));

    expect(screen.getByTestId('holding-add-query')).toBeInTheDocument();
  });

  it('keeps the submit button disabled until an account, a pick and a quantity are set', async () => {
    const user = userEvent.setup();
    await renderDialog();

    expect(screen.getByTestId('holding-add-submit')).toBeDisabled();
    await screen.findByRole('option', { name: 'Saxo Investor' });

    await user.selectOptions(screen.getByTestId('holding-add-account'), 'a1');
    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));

    expect(screen.getByTestId('holding-add-submit')).toBeDisabled();

    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    expect(screen.getByTestId('holding-add-submit')).toBeEnabled();
  });

  it('emits saved once the holding has been created', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await screen.findByRole('option', { name: 'Saxo Investor' });

    await user.selectOptions(screen.getByTestId('holding-add-account'), 'a1');
    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    await user.click(screen.getByTestId('holding-add-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({});

    await vi.waitFor(() => expect(saved).toHaveBeenCalled());
  });

  it('emits dismissed on the native dialog close', async () => {
    await renderDialog();

    screen.getByRole('dialog').dispatchEvent(new Event('close'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('reads an optional average cost', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await screen.findByRole('option', { name: 'Saxo Investor' });

    await user.selectOptions(screen.getByTestId('holding-add-account'), 'a1');
    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    await user.type(screen.getByTestId('holding-add-average-cost'), '24,12');
    await user.click(screen.getByTestId('holding-add-submit'));

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings'));
    expect(request.request.body).toEqual({ accountId: 'a1', instrumentId: 'i1', quantity: 10, averageCost: 24.12 });
    request.flush({});
  });

  it('falls back to a blank subline for a catalogue instrument with no ISIN', async () => {
    const user = userEvent.setup();
    await render(HoldingAddDialog, {
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
    httpTesting.expectOne('/api/instruments').flush([{ ...instruments[0], isin: null }]);

    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));

    expect(screen.getByTestId('holding-add-quantity')).toBeInTheDocument();
  });

  it('falls back to a blank exchange for an online candidate with none', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'ishares world');
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
      { name: 'iShares Core MSCI World', source: 'YAHOO', sourceRef: 'EUNL.DE', assetClass: 'ETF', probePrice: 97.84 },
    ]);
    await user.click(await screen.findByTestId('holding-add-online-candidate'));

    expect(screen.getByText(/EUNL.DE/)).toBeInTheDocument();
  });

  it('shows a generic error when creating the holding itself fails', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await screen.findByRole('option', { name: 'Saxo Investor' });

    await user.selectOptions(screen.getByTestId('holding-add-account'), 'a1');
    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    await user.click(await screen.findByTestId('holding-add-catalog-candidate'));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    await user.click(screen.getByTestId('holding-add-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    expect(await screen.findByTestId('holding-add-error')).toHaveTextContent('holdings.add.error');
  });

  it('shows the instrument-specific error when creating the instrument fails', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await screen.findByRole('option', { name: 'Saxo Investor' });

    await user.selectOptions(screen.getByTestId('holding-add-account'), 'a1');
    await user.type(screen.getByTestId('holding-add-query'), 'zzz');
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
    await user.click(await screen.findByTestId('holding-add-create-manual'));
    await user.selectOptions(screen.getByTestId('holding-add-asset-class'), 'ETF');
    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    await user.click(screen.getByTestId('holding-add-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    expect(await screen.findByTestId('holding-add-error')).toHaveTextContent('holdings.add.instrumentError');
  });

  it('requires an asset class for a manual creation, with no default, and sends it to the API', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await screen.findByRole('option', { name: 'Saxo Investor' });

    await user.selectOptions(screen.getByTestId('holding-add-account'), 'a1');
    await user.type(screen.getByTestId('holding-add-query'), 'zzz');
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve').flush([]));
    await user.click(await screen.findByTestId('holding-add-create-manual'));
    await user.type(screen.getByTestId('holding-add-quantity'), '10');

    expect(screen.getByTestId('holding-add-asset-class')).toHaveValue('');
    expect(screen.getByTestId('holding-add-submit')).toBeDisabled();

    await user.selectOptions(screen.getByTestId('holding-add-asset-class'), 'CRYPTO');
    expect(screen.getByTestId('holding-add-submit')).toBeEnabled();

    await user.click(screen.getByTestId('holding-add-submit'));

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/instruments'));
    expect(request.request.body).toMatchObject({ assetClass: 'CRYPTO' });
    request.flush({ id: 'i2', name: 'zzz', assetClass: 'CRYPTO', priceSource: 'MANUAL' });

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush({});
  });
});
