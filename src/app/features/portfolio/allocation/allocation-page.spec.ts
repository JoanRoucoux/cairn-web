import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, type Provider, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { delayedScopeLoader, getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AllocationPage } from './allocation-page';
import { AllocationStore } from './allocation-store';

const CLASSES = '/api/portfolio/allocation/classes';
const ACCOUNTS = '/api/portfolio/allocation/accounts';
const FAIL = 'fail' as const;

const classesBody = {
  totalEur: 247_912,
  unvaluedCount: 0,
  nonEurCount: 0,
  items: [
    { assetClass: 'ETF', valueEur: 128_656, share: 0.519, lineCount: 2 },
    { assetClass: 'CASH', valueEur: 119_256, share: 0.481, lineCount: 1 },
  ],
};

const accountItem = (name: string, type: string, institution: string, valueEur: number, share: number): object => ({
  account: { id: `id-${name}`, name, type, institution },
  valueEur,
  share,
  lineCount: 1,
});

const accountsBody = {
  totalEur: 247_912,
  unvaluedCount: 0,
  nonEurCount: 0,
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
    extraProviders: Provider[] = [],
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
        ...extraProviders,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    answer(CLASSES, classes);
    answer(ACCOUNTS, accounts);
  };

  afterEach(() => httpTesting.verify());

  it('does not translate its portfolio scope keys before the scope has loaded', async () => {
    const translate = vi.spyOn(TranslocoService.prototype, 'translate');
    await renderPage(classesBody, accountsBody, [delayedScopeLoader()]);

    expect(
      translate.mock.calls.filter(
        ([key]) =>
          String(key).startsWith('portfolio.allocation.cashSubtitle') ||
          String(key).startsWith('portfolio.allocation.lineCount'),
      ),
    ).toEqual([]);

    translate.mockRestore();
  });

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

  it.each([
    ['ETF', 'etf'],
    ['FUND', 'fonds'],
    ['EQUITY', 'actions'],
    ['CRYPTO', 'crypto'],
    ['CASH', 'liquidites'],
  ])('should link the %s class row to the %s slug and navigate on a plain click', async (assetClass, slug) => {
    const user = userEvent.setup();
    await renderPage({
      totalEur: 100,
      items: ['ETF', 'FUND', 'EQUITY', 'CRYPTO', 'CASH'].map((code) => ({
        assetClass: code,
        valueEur: 20,
        share: 0.2,
        lineCount: 1,
      })),
    });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const [row] = await screen.findAllByRole('link', { name: new RegExp(assetClass) });

    expect(row).toHaveAttribute('href', `/holdings?classe=${slug}`);

    await user.click(row!);

    expect(navigate).toHaveBeenCalledWith(['/holdings'], { queryParams: { classe: slug } });
  });

  it('should keep the Others class row a button that goes nowhere', async () => {
    const user = userEvent.setup();
    const classes = ['ETF', 'FUND', 'EQUITY', 'CRYPTO', 'CASH', 'ETF', 'FUND', 'EQUITY'].map((assetClass, index) => ({
      assetClass,
      valueEur: 8 - index,
      share: 0.1,
      lineCount: 1,
    }));
    await renderPage({ totalEur: 7, items: classes });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await user.click(await screen.findByRole('button', { name: /portfolio.allocation.others/ }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('should link the account rows to the filtered holdings by account id', async () => {
    const user = userEvent.setup();
    await renderPage();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const [row] = await screen.findAllByRole('link', { name: /Esalia/ });

    expect(row).toHaveAttribute('href', '/holdings?compte=id-Esalia');

    await user.click(row!);

    expect(navigate).toHaveBeenCalledWith(['/holdings'], { queryParams: { compte: 'id-Esalia' } });
  });

  it('should keep the Others row a button that goes nowhere', async () => {
    const user = userEvent.setup();
    const many = {
      totalEur: 7,
      items: Array.from({ length: 8 }, (_, index) => accountItem('A' + index, 'PEA', 'Saxo', 8 - index, 0.1)),
    };
    await renderPage(classesBody, many);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await user.click(await screen.findByRole('button', { name: /portfolio.allocation.others/ }));

    expect(navigate).not.toHaveBeenCalled();
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

  it('should say nothing about lines left out when there are none', async () => {
    await renderPage();

    await screen.findByText('portfolio.allocation.total');

    expect(screen.queryByTestId('allocation-excluded')).not.toBeInTheDocument();
  });

  it('should say under the total how many unpriced lines it leaves out', async () => {
    await renderPage({ ...classesBody, unvaluedCount: 1 });

    expect(await screen.findByTestId('allocation-excluded')).toHaveTextContent('Excluded.noQuote_one');
  });

  it('should say "hors N lignes" once a non-EUR line is among them', async () => {
    await renderPage({ ...classesBody, unvaluedCount: 1, nonEurCount: 2 });

    expect(await screen.findByTestId('allocation-excluded')).toHaveTextContent('Excluded.lines_other');
  });

  it('should read the counts of the account breakdown when the class breakdown fails', async () => {
    await renderPage(FAIL, { ...accountsBody, nonEurCount: 1 });

    expect(await screen.findByTestId('allocation-excluded')).toHaveTextContent('Excluded.lines_one');
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
