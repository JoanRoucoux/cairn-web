import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { ManualQuoteDialog } from './manual-quote-dialog';

describe('ManualQuoteDialog', () => {
  let httpTesting: HttpTestingController;
  const saved = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (): Promise<void> => {
    await render(ManualQuoteDialog, {
      inputs: { instrumentId: 'i1', instrumentName: 'BNP Paribas Easy S&P 500' },
      on: { saved, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpTesting.verify();
    saved.mockClear();
    dismissed.mockClear();
  });

  it('should name the instrument being priced', async () => {
    await renderDialog();

    expect(screen.getByTestId('manual-quote-dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('holdings.manualQuote.title');
  });

  it('should label both fields', async () => {
    await renderDialog();

    expect(screen.getByTestId('manual-quote-as-of')).toHaveAttribute('id');
    expect(screen.getByLabelText('holdings.manualQuote.price')).toBeInTheDocument();
  });

  it('should emit dismissed on cancel', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('manual-quote-cancel'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('should emit dismissed when the native dialog closes', async () => {
    await renderDialog();

    screen.getByRole('dialog').dispatchEvent(new Event('close'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('should emit saved once the quote is accepted', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('manual-quote-price'), '33.3069');
    await user.click(screen.getByTestId('manual-quote-submit'));

    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/i1/quotes').flush({}));
    await vi.waitFor(() => expect(saved).toHaveBeenCalled());
  });

  it('should stay open and show an error when the API refuses', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.type(screen.getByTestId('manual-quote-price'), '33.3069');
    await user.click(screen.getByTestId('manual-quote-submit'));

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/instruments/i1/quotes').flush(null, { status: 422, statusText: 'Unprocessable' }),
    );

    expect(await screen.findByTestId('manual-quote-error')).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });
});
