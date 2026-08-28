import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { InstrumentFormPage } from './instrument-form-page';
import { InstrumentFormStore } from './instrument-form-store';

describe('InstrumentFormPage', () => {
  let httpTesting: HttpTestingController;
  let router: Router;

  const renderPage = async (): Promise<void> => {
    await render(InstrumentFormPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        InstrumentFormStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  };

  afterEach(() => httpTesting.verify());

  it('should search and apply a candidate to the draft', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.type(screen.getByRole('searchbox', { name: 'instruments.lookup.label' }), 'FR0011550185');
    await user.click(screen.getByRole('button', { name: 'instruments.lookup.search' }));

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments/resolve'))).flush([
      {
        sourceRef: 'ESE.PA',
        name: 'BNP Paribas Easy S&P 500',
        source: 'YAHOO',
        assetClass: 'ETF',
        probePrice: 33.3069,
      },
    ]);

    const candidate = await screen.findByTestId('isin-candidate');
    await user.click(candidate);

    expect(screen.getByTestId('instrument-name')).toHaveValue('BNP Paribas Easy S&P 500');
    expect(screen.getByTestId('instrument-source-ref')).toHaveValue('ESE.PA');
  });

  it('should save the instrument and navigate back to the list', async () => {
    const user = userEvent.setup();
    await renderPage();
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await user.type(screen.getByTestId('instrument-name'), 'BNP Paribas Easy S&P 500');
    await user.click(screen.getByTestId('instrument-save'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush({});

    await vi.waitFor(() => expect(navigateByUrl).toHaveBeenCalledWith('/instruments'));
  });

  it('should stay on the page and show an error when the API refuses', async () => {
    const user = userEvent.setup();
    await renderPage();
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await user.type(screen.getByTestId('instrument-name'), 'BNP Paribas Easy S&P 500');
    await user.click(screen.getByTestId('instrument-save'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush(null, {
      status: 422,
      statusText: 'Unprocessable',
    });

    expect(await screen.findByText('instruments.saveError')).toBeInTheDocument();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
