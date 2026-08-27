import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingListPage } from './holding-list-page';
import { HoldingListStore } from './holding-list-store';

const holdings = [
  {
    id: 'h1',
    accountId: 'a1',
    accountName: 'Saxo Investor',
    accountType: 'PEA',
    instrumentName: 'BNP Paribas Easy S&P 500',
    quantity: 676,
    price: 33.3069,
    marketValueEur: 22515.47,
    unrealizedGainEur: 4497.36,
    stale: false,
  },
  {
    id: 'h3',
    accountId: 'a2',
    accountName: 'Esalia',
    accountType: 'PEE',
    instrumentName: 'FCPE Actions',
    quantity: 412.5,
    price: 289.11,
    marketValueEur: 119258,
    unrealizedGainEur: null,
    stale: true,
  },
];

describe('HoldingListPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (): Promise<Awaited<ReturnType<typeof render>>> => {
    const result = await render(HoldingListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
        HoldingListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush(holdings);

    return result;
  };

  afterEach(() => httpTesting.verify());

  it('should group the holdings by account', async () => {
    await renderPage();

    expect(await screen.findByText('Esalia')).toBeInTheDocument();
    expect(screen.getByText('Saxo Investor')).toBeInTheDocument();
  });

  it('should expand the largest account and leave the others collapsed', async () => {
    const { container } = await renderPage();

    await screen.findByText('Esalia');
    const groups = container.querySelectorAll('details');
    expect(groups[0]).toHaveAttribute('open');
    expect(groups[1]).not.toHaveAttribute('open');
  });

  it('should filter as the user types', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findByText('Esalia');

    await user.type(screen.getByTestId('holdings-search'), 'saxo');

    expect(await screen.findByText('Saxo Investor')).toBeInTheDocument();
    expect(screen.queryByText('Esalia')).not.toBeInTheDocument();
  });

  it('should tell the user when nothing matches', async () => {
    const user = userEvent.setup();
    await renderPage();
    await screen.findByText('Esalia');

    await user.type(screen.getByTestId('holdings-search'), 'zzz');

    expect(await screen.findByText('holdings.empty')).toBeInTheDocument();
  });

  it('should tell the user when holdings fail to load', async () => {
    await render(HoldingListPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('holdings'),
        HoldingListStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/holdings').flush('boom', { status: 500, statusText: 'Server error' });

    expect(await screen.findByRole('alert')).toHaveTextContent('holdings.error');
  });
});
