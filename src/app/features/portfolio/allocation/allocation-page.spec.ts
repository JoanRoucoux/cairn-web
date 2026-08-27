import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { AllocationPage } from './allocation-page';
import { AllocationStore } from './allocation-store';

describe('AllocationPage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (
    respondToPortfolio: (request: ReturnType<HttpTestingController['expectOne']>) => void = (request) =>
      request.flush({
        byAssetClass: [{ label: 'Funds', valueEur: 128656, share: 0.463 }],
        byAccount: [
          { label: 'Esalia', valueEur: 119258, share: 0.429 },
          { label: 'Saxo Investor', valueEur: 87810, share: 0.316 },
        ],
      }),
  ): Promise<void> => {
    await render(AllocationPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en-GB' },
        provideTranslocoScope('portfolio'),
        AllocationStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    respondToPortfolio(httpTesting.expectOne('/api/portfolio'));
  };

  afterEach(() => httpTesting.verify());

  it('should show both breakdowns', async () => {
    await renderPage();

    expect(await screen.findAllByRole('meter')).toHaveLength(3);
  });

  it('should state that the bars are scaled to the largest row', async () => {
    await renderPage();

    expect(await screen.findByText('portfolio.allocation.scaleNote')).toBeInTheDocument();
  });

  it('should show an error message when the portfolio fails to load', async () => {
    await renderPage((request) => request.flush(null, { status: 500, statusText: 'Server Error' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
