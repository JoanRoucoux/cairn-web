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

const CLASSES = '/api/portfolio/allocation/classes';
const ACCOUNTS = '/api/portfolio/allocation/accounts';
const FAIL = 'fail' as const;

const classesBody = {
  totalEur: 247_912,
  items: [
    { assetClass: 'ETF', valueEur: 128_656, share: 0.519, lineCount: 2 },
    { assetClass: 'CASH', valueEur: 119_256, share: 0.481, lineCount: 1 },
  ],
};

const accountItem = (name: string, type: string, institution: string, valueEur: number, share: number): object => ({
  account: { id: name, name, type, institution },
  valueEur,
  share,
  lineCount: 1,
});

const accountsBody = {
  totalEur: 247_912,
  items: [
    accountItem('Saxo Investor', 'PEA', 'Saxo', 128_654, 0.519),
    accountItem('Esalia', 'PEE', 'Amundi', 119_258, 0.481),
  ],
};

describe('AllocationPage', () => {
  let httpTesting: HttpTestingController;
  let router: Router;

  const answer = (url: string, body: object | typeof FAIL): void => {
    const request = httpTesting.expectOne(url);

    if (body === FAIL) {
      request.flush(null, { status: 500, statusText: 'Server Error' });
    } else {
      request.flush(body);
    }
  };

  const renderPage = async (
    classes: object | typeof FAIL = classesBody,
    accounts: object | typeof FAIL = accountsBody,
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
    answer(CLASSES, classes);
    answer(ACCOUNTS, accounts);
  };

  afterEach(() => httpTesting.verify());

  it('should show the total under the header', async () => {
    await renderPage();

    expect(await screen.findByText('portfolio.allocation.total')).toBeInTheDocument();
  });

  it('should show the total from the accounts call when the classes call fails', async () => {
    await renderPage(FAIL);

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
    await renderPage({ totalEur: 1, items: [{ assetClass: 'ETF', valueEur: 1, share: 1, lineCount: 1 }] });

    expect(await screen.findByText('portfolio.allocation.lineCount_one')).toBeInTheDocument();
  });

  it('should show the envelope and institution as the account sub-label', async () => {
    await renderPage();

    expect(await screen.findByText('enums.accountType.PEE · Amundi')).toBeInTheDocument();
  });

  it('should show the envelope alone when the institution is blank', async () => {
    await renderPage(classesBody, { totalEur: 1, items: [accountItem('Esalia', 'PEE', '  ', 1, 1)] });

    expect(await screen.findByText('enums.accountType.PEE')).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
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

  it('should fail the classes ring on its own and retry only that call', async () => {
    const user = userEvent.setup();
    await renderPage(FAIL);

    expect(await screen.findAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByText('Esalia')).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'portfolio.error.retry' }));
    httpTesting.expectNone(ACCOUNTS);
    httpTesting.expectOne(CLASSES).flush(classesBody);

    expect(await screen.findAllByText('enums.assetClass.ETF')).not.toHaveLength(0);
  });

  it('should fail the accounts ring on its own and retry only that call', async () => {
    const user = userEvent.setup();
    await renderPage(classesBody, FAIL);

    expect(await screen.findAllByRole('alert')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'portfolio.error.retry' }));
    httpTesting.expectNone(CLASSES);
    httpTesting.expectOne(ACCOUNTS).flush(accountsBody);

    expect(await screen.findAllByText('Esalia')).not.toHaveLength(0);
  });

  it('should show no total when both calls fail', async () => {
    await renderPage(FAIL, FAIL);

    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.queryByText('portfolio.allocation.total')).not.toBeInTheDocument();
  });

  it('should show the empty state when a breakdown has no slice', async () => {
    await renderPage({ totalEur: 0, items: [] }, { totalEur: 0, items: [] });

    expect(await screen.findAllByText('portfolio.allocation.empty')).toHaveLength(2);
  });
});
