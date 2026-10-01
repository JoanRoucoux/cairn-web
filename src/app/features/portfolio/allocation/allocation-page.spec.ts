import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AllocationPage } from './allocation-page';
import { AllocationStore } from './allocation-store';

const portfolioBody = {
  totalEur: 247_912,
  byAssetClass: [
    { label: 'ETF', valueEur: 128_656, share: 0.519 },
    { label: 'CASH', valueEur: 119_256, share: 0.481 },
  ],
  byAccount: [
    { label: 'Esalia', valueEur: 119_258, share: 0.481 },
    { label: 'Saxo Investor', valueEur: 128_654, share: 0.519 },
  ],
  holdings: [{ assetClass: 'ETF' }, { assetClass: 'ETF' }, { assetClass: 'CASH' }],
};

const accountsBody = [
  { id: 'a1', name: 'Esalia', type: 'PEE', institution: 'Amundi' },
  { id: 'a2', name: 'Saxo Investor', type: 'PEA', institution: 'Saxo' },
];

describe('AllocationPage', () => {
  let httpTesting: HttpTestingController;
  let router: Router;

  const renderPage = async (
    respond: (portfolioRequest: ReturnType<HttpTestingController['expectOne']>) => void = (request) =>
      request.flush(portfolioBody),
  ): Promise<void> => {
    await render(AllocationPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        provideTranslocoScope('portfolio'),
        AllocationStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    respond(httpTesting.expectOne('/api/portfolio'));
    httpTesting.expectOne('/api/accounts').flush(accountsBody);
  };

  afterEach(() => httpTesting.verify());

  it('should show the total under the header', async () => {
    await renderPage();

    expect(await screen.findByText('portfolio.allocation.total')).toBeInTheDocument();
  });

  it('should show both donuts with translated labels', async () => {
    await renderPage();

    expect(await screen.findAllByText('enums.assetClass.ETF')).not.toHaveLength(0);
    expect(await screen.findAllByText('Esalia')).not.toHaveLength(0);
  });

  it('should show the cash balances as the cash sub-label instead of a line count', async () => {
    await renderPage();

    const cashSubtitle = await screen.findByText('portfolio.allocation.cashSubtitle');

    expect(cashSubtitle.parentElement).toHaveTextContent('enums.assetClass.CASH');
    expect(screen.getByText('portfolio.allocation.lineCount_other')).toBeInTheDocument();
  });

  it('should use the singular form for a class holding a single line', async () => {
    await renderPage((request) =>
      request.flush({ ...portfolioBody, holdings: [{ assetClass: 'ETF' }, { assetClass: 'CASH' }] }),
    );

    expect(await screen.findByText('portfolio.allocation.lineCount_one')).toBeInTheDocument();
  });

  it('should show the envelope and institution as the account sub-label', async () => {
    await renderPage();

    expect(await screen.findByText('enums.accountType.PEE · Amundi')).toBeInTheDocument();
  });

  it('should navigate to the filtered holdings when an asset-class row is activated', async () => {
    const user = userEvent.setup();
    await renderPage();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await user.click((await screen.findAllByRole('button', { name: /ETF/ }))[0]!);

    expect(navigate).toHaveBeenCalledWith(['/holdings'], { queryParams: { assetClass: 'ETF' } });
  });

  it('should navigate to the filtered holdings when an account row is activated', async () => {
    const user = userEvent.setup();
    await renderPage();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await user.click((await screen.findAllByRole('button', { name: /Esalia/ }))[0]!);

    expect(navigate).toHaveBeenCalledWith(['/holdings'], { queryParams: { account: 'Esalia' } });
  });

  it('should show an error message with a retry when the portfolio fails to load', async () => {
    const user = userEvent.setup();
    await renderPage((request) => request.flush(null, { status: 500, statusText: 'Server Error' }));

    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.queryByText('portfolio.allocation.total')).not.toBeInTheDocument();

    httpTesting.expectNone('/api/portfolio');
    await user.click(screen.getAllByRole('button', { name: 'portfolio.error.retry' })[0]!);
    httpTesting.expectOne('/api/portfolio').flush(null, { status: 500, statusText: 'Server Error' });
    httpTesting.expectOne('/api/accounts').flush(accountsBody);

    await user.click((await screen.findAllByRole('button', { name: 'portfolio.error.retry' }))[1]!);
    httpTesting.expectOne('/api/portfolio').flush(portfolioBody);
    httpTesting.expectOne('/api/accounts').flush(accountsBody);
  });

  it('should show an account row with no sub-label when the accounts call has not answered yet', async () => {
    await render(AllocationPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        provideTranslocoScope('portfolio'),
        AllocationStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/portfolio').flush(portfolioBody);

    expect(await screen.findByText('Esalia')).toBeInTheDocument();

    httpTesting.expectOne('/api/accounts').flush(accountsBody);
  });

  it('should show the empty state when a breakdown has no slice', async () => {
    await renderPage((request) => request.flush({ ...portfolioBody, byAssetClass: [], byAccount: [] }));

    expect(await screen.findAllByText('portfolio.allocation.empty')).toHaveLength(2);
  });
});
