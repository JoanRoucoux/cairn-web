import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, type TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen, within } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingChanges } from '../holding-changes';
import { HoldingAddDialog } from './holding-add-dialog';

const accounts = [
  { id: 'a1', name: 'Northwind PEA', type: 'PEA', institution: 'Northwind Bank' },
  { id: 'a2', name: 'Contoso Trading', type: 'CTO', institution: 'Contoso Bank' },
];

const tracked = {
  id: 'h1',
  accountId: 'a1',
  instrumentId: 'i1',
  instrumentName: 'Amundi MSCI World',
  isin: 'LU1681043599',
  sourceRef: 'CW8.PA',
  assetClass: 'ETF',
  priceSource: 'YAHOO',
  price: 528.31,
  priceCurrency: 'EUR',
};

const hit = {
  name: 'iShares Core MSCI World',
  source: 'YAHOO',
  sourceRef: 'EUNL.DE',
  symbol: 'EUNL.DE',
  exchange: 'Xetra',
  assetClass: 'ETF',
  probePrice: 97.84,
  currency: 'EUR',
};

describe('HoldingAddDialog', () => {
  let httpTesting: HttpTestingController;
  const saved = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (presetAccountId: string | null = null): Promise<void> => {
    await render(HoldingAddDialog, {
      inputs: { presetAccountId },
      on: { saved, dismissed },
      imports: [getTranslocoTestingModule()],
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
    httpTesting.expectOne('/api/accounts').flush(accounts);
    httpTesting.expectOne('/api/holdings').flush([tracked]);
  };

  const searchOf = (source: string): Promise<TestRequest> =>
    vi.waitFor(() =>
      httpTesting.expectOne(
        (request) => request.url === '/api/instruments/search' && request.params.get('source') === source,
      ),
    );

  const chip = (name: string): HTMLElement =>
    within(screen.getByRole('group', { name: 'holdings.add.sourcesLabel' })).getByRole('button', { name });

  const searchMsci = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    (await searchOf('YAHOO')).flush([hit]);
    (await searchOf('COINGECKO')).flush([]);
  };

  afterEach(() => {
    httpTesting.verify();
    saved.mockClear();
    dismissed.mockClear();
  });

  it('opens on the search, focused, with every source chosen and no account yet', async () => {
    await renderDialog();

    const query = screen.getByRole('searchbox', { name: 'holdings.add.searchLabel' });
    await vi.waitFor(() => expect(query).toHaveFocus());
    expect(query).toHaveAttribute('placeholder', 'holdings.add.placeholder.ALL');
    expect(screen.getByTestId('holding-add-help')).toHaveTextContent('holdings.add.help.ALL');
    expect(chip('holdings.add.allSources')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('enums.priceSource.AMUNDI')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('holding-add-account')).not.toBeInTheDocument();
    expect(screen.getByTestId('holding-add-submit')).toHaveTextContent('holdings.add.submit');
    expect(screen.getByTestId('holding-add-submit')).toBeDisabled();
  });

  it('changes the placeholder and the help with the chosen source', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(chip('enums.priceSource.COINGECKO'));

    expect(chip('enums.priceSource.COINGECKO')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('holding-add-query')).toHaveAttribute(
      'placeholder',
      'holdings.add.placeholder.COINGECKO',
    );
    expect(screen.getByTestId('holding-add-help')).toHaveTextContent('holdings.add.help.COINGECKO');
  });

  it('lists the tracked titles first, then each source under its own heading', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await searchMsci(user);

    const results = await screen.findByTestId('holding-add-results');
    const groups = within(results)
      .getAllByRole('group')
      .map((group) => group.getAttribute('aria-label'));
    expect(groups).toEqual([
      'holdings.add.tracked.heading, holdings.add.tracked.nature',
      'enums.priceSource.YAHOO, holdings.add.nature.YAHOO',
    ]);
    expect(screen.getByTestId('holding-add-tracked-title')).toHaveTextContent(
      /LU1681043599 · enums.assetClass.ETF · enums.priceSource.YAHOO.*€528.31.*holdings.add.tracked.priceCaption/,
    );
    expect(await screen.findByTestId('holding-add-online-candidate')).toHaveTextContent(
      /Xetra · EUNL.DE.*€97.84.*holdings.add.priceCaption.YAHOO/,
    );
  });

  it('picks a title found online, then asks for the account, prefilled, and the quantity', async () => {
    const user = userEvent.setup();
    await renderDialog('a2');
    await searchMsci(user);

    await user.click(await screen.findByTestId('holding-add-online-candidate'));

    expect(screen.queryByTestId('holding-add-query')).not.toBeInTheDocument();
    expect(screen.getByTestId('holding-add-picked')).toHaveTextContent('holdings.add.newBadge');
    expect(screen.getByTestId('holding-add-source-line')).toHaveTextContent(
      /enums.priceSource.YAHOO · holdings.add.sourceLine.YAHOO · holdings.add.trial €97.84/,
    );
    expect(screen.getByTestId('holding-add-account')).toHaveValue('a2');
    await vi.waitFor(() => expect(screen.getByTestId('holding-add-quantity')).toHaveFocus());
    expect(screen.getByTestId('holding-add-submit')).toHaveTextContent('holdings.add.submitNew');

    await user.type(screen.getByTestId('holding-add-quantity'), '10');
    expect(screen.getByTestId('holding-add-value')).toHaveTextContent('holdings.add.valueAtProbe €978.40');
  });

  it('picks a tracked title without the New badge, and Change goes back to the same search', async () => {
    const user = userEvent.setup();
    await renderDialog();
    await searchMsci(user);

    await user.click(await screen.findByTestId('holding-add-tracked-title'));

    expect(screen.getByTestId('holding-add-picked')).not.toHaveTextContent('holdings.add.newBadge');
    expect(screen.getByTestId('holding-add-source-line')).toHaveTextContent(
      'enums.priceSource.YAHOO · holdings.add.sourceLine.tracked',
    );
    expect(screen.getByTestId('holding-add-submit')).toHaveTextContent('holdings.add.submit');

    await user.click(screen.getByTestId('holding-add-change'));

    await vi.waitFor(() => expect(screen.getByTestId('holding-add-query')).toHaveFocus());
    expect(screen.getByTestId('holding-add-query')).toHaveValue('msci');
    expect(screen.getByTestId('holding-add-online-candidate')).toBeInTheDocument();
    httpTesting.expectNone('/api/instruments/search');
  });

  it('shows a failing source with its own retry', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'msci');
    (await searchOf('YAHOO')).flush([]);
    (await searchOf('COINGECKO')).flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(await screen.findByText('holdings.add.sourceError')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'holdings.add.retry' }));
    (await searchOf('COINGECKO')).flush([]);
  });

  it('says nothing was found anywhere and keeps the two links', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('holding-add-query'), 'zzz');
    (await searchOf('YAHOO')).flush([]);
    (await searchOf('COINGECKO')).flush([]);

    expect(await screen.findByTestId('holding-add-none-found')).toHaveTextContent('holdings.add.noneFound');
    expect(screen.getByTestId('holding-add-sirius-link')).toHaveTextContent(
      'holdings.add.siriusLinkholdings.add.siriusLinkSub',
    );
    expect(screen.getByTestId('holding-add-manual-link')).toHaveTextContent(
      'holdings.add.manualLinkholdings.add.manualLinkSub',
    );
  });

  it('offers every source when the chosen one has nothing, and Amundi asks for an ISIN', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(chip('enums.priceSource.COINGECKO'));
    await user.type(screen.getByTestId('holding-add-query'), 'zzz');
    (await searchOf('COINGECKO')).flush([]);

    expect(await screen.findByText('holdings.add.sourceEmpty')).toBeInTheDocument();
    await user.click(screen.getByTestId('holding-add-search-all'));
    expect(chip('holdings.add.allSources')).toHaveAttribute('aria-pressed', 'true');
    (await searchOf('YAHOO')).flush([]);

    await user.click(chip('enums.priceSource.AMUNDI'));
    expect(await screen.findByText('holdings.add.amundiNeedsIsin')).toBeInTheDocument();
  });

  it('takes an SG Sirius ISIN: example, counter, format error, then the position', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-add-sirius-link'));
    const isin = screen.getByTestId('holding-add-sirius-isin');
    await vi.waitFor(() => expect(isin).toHaveFocus());
    expect(screen.getByText('holdings.add.sirius.example')).toBeInTheDocument();
    expect(screen.getByTestId('holding-add-sirius-note')).toHaveTextContent('holdings.add.sirius.note');
    expect(screen.getByTestId('holding-add-submit')).toHaveTextContent('holdings.add.submitSirius');

    await user.type(isin, 'xs2');
    expect(isin).toHaveValue('XS2');
    expect(screen.getByText('holdings.add.sirius.count_other')).toBeInTheDocument();
    await user.clear(isin);
    await user.type(isin, 'x');
    expect(screen.getByText('holdings.add.sirius.count_one')).toBeInTheDocument();

    await user.type(isin, 's238123456x');
    expect(screen.getByRole('alert')).toHaveTextContent('holdings.add.sirius.invalid');
    expect(screen.queryByTestId('holding-add-account')).not.toBeInTheDocument();

    await user.clear(isin);
    await user.type(isin, 'XS2381234567');
    expect(screen.getByText('holdings.add.sirius.valid')).toBeInTheDocument();
    expect(screen.getByTestId('holding-add-account')).toHaveValue('a1');

    await user.click(screen.getByTestId('holding-add-back'));
    await vi.waitFor(() => expect(screen.getByTestId('holding-add-query')).toHaveFocus());
  });

  it('takes a manual title: name, class Autre by default, price, then the value at that price', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-add-manual-link'));
    const name = screen.getByTestId('holding-add-manual-name');
    await vi.waitFor(() => expect(name).toHaveFocus());
    const classes = within(screen.getByTestId('holding-add-manual-class')).getAllByRole('option');
    expect(classes.map((option) => option.getAttribute('value'))).toEqual([
      'EQUITY',
      'ETF',
      'FUND',
      'CRYPTO',
      'BOND',
      'OTHER',
    ]);
    expect(screen.getByTestId('holding-add-manual-class')).toHaveValue('OTHER');

    await user.type(name, 'Northwind Private Equity');
    await user.selectOptions(screen.getByTestId('holding-add-manual-class'), 'BOND');
    await user.type(screen.getByTestId('holding-add-manual-price'), '1135');
    await user.type(screen.getByTestId('holding-add-quantity'), '8');

    expect(screen.getByTestId('holding-add-value')).toHaveTextContent('holdings.add.valueAtManual €9,080.00');
    expect(screen.getByTestId('holding-add-submit')).toHaveTextContent('holdings.add.submitNew');

    await user.type(screen.getByTestId('holding-add-average-cost'), '1000');
    await user.click(screen.getByTestId('holding-add-submit'));
    const request = await vi.waitFor(() => httpTesting.expectOne('/api/holdings'));
    expect(request.request.body).toEqual({
      accountId: 'a1',
      quantity: 8,
      averageCost: 1000,
      instrument: { priceSource: 'MANUAL', name: 'Northwind Private Equity', assetClass: 'BOND', price: 1135 },
    });
    request.flush({ id: 'h9' });
    await vi.waitFor(() => expect(saved).toHaveBeenCalledWith({ id: 'h9' }));
  });

  it('says the account already holds the title, until another account is chosen', async () => {
    const user = userEvent.setup();
    await renderDialog('a1');
    await searchMsci(user);
    await user.click(await screen.findByTestId('holding-add-tracked-title'));
    await user.type(screen.getByTestId('holding-add-quantity'), '3');
    await user.click(screen.getByTestId('holding-add-submit'));

    expect(await screen.findByTestId('holding-add-error')).toHaveTextContent('holdings.add.duplicate');

    await user.selectOptions(screen.getByTestId('holding-add-account'), 'a2');
    await vi.waitFor(() => expect(screen.queryByTestId('holding-add-error')).not.toBeInTheDocument());
  });

  it('says when the line was refused', async () => {
    const user = userEvent.setup();
    await renderDialog('a2');
    await searchMsci(user);
    await user.click(await screen.findByTestId('holding-add-online-candidate'));
    await user.type(screen.getByTestId('holding-add-quantity'), '3');
    await user.click(screen.getByTestId('holding-add-submit'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    expect(await screen.findByTestId('holding-add-error')).toHaveTextContent('holdings.add.error');
    expect(saved).not.toHaveBeenCalled();
  });

  it('dismisses from the Cancel button', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-add-cancel'));

    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
    expect(saved).not.toHaveBeenCalled();
  });
});
