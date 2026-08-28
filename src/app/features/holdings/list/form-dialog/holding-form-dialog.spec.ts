import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingFormDialog } from './holding-form-dialog';

describe('HoldingFormDialog', () => {
  let httpTesting: HttpTestingController;
  const savedForm = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (holding?: HoldingResponse): Promise<void> => {
    await render(HoldingFormDialog, {
      inputs: { holding },
      on: { savedForm, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('holdings'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => httpTesting.expectOne('/api/accounts').flush([{ id: 'a1', name: 'Saxo Investor' }]));
    await vi.waitFor(() => httpTesting.expectOne('/api/instruments').flush([{ id: 'i1', name: 'ETF' }]));
  };

  afterEach(() => {
    httpTesting.verify();
    savedForm.mockClear();
    dismissed.mockClear();
  });

  it('should show the create title with no holding', async () => {
    await renderDialog();

    expect(await screen.findByText('holdings.form.createTitle')).toBeInTheDocument();
  });

  it('should show the edit title with an existing holding', async () => {
    await renderDialog({
      id: 'h1',
      accountId: 'a1',
      instrumentId: 'i1',
      quantity: 10,
      averageCost: 5,
    } as HoldingResponse);

    expect(await screen.findByText('holdings.form.editTitle')).toBeInTheDocument();
  });

  it('should emit dismissed on cancel', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-form-cancel'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('should emit dismissed when the native dialog closes', async () => {
    await renderDialog();

    screen.getByRole('dialog').dispatchEvent(new Event('close'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('should emit savedForm once the holding is accepted', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await screen.findByRole('option', { name: 'Saxo Investor' });
    await user.selectOptions(screen.getByTestId('holding-form-account'), 'a1');
    await user.selectOptions(screen.getByTestId('holding-form-instrument'), 'i1');
    await user.type(screen.getByTestId('holding-form-quantity'), '10');
    await user.click(screen.getByTestId('holding-form-submit'));

    await vi.waitFor(() => httpTesting.expectOne('/api/holdings').flush({}));
    await vi.waitFor(() => expect(savedForm).toHaveBeenCalled());
  });

  it('should stay open and show an error when the API refuses', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await screen.findByRole('option', { name: 'Saxo Investor' });
    await user.selectOptions(screen.getByTestId('holding-form-account'), 'a1');
    await user.selectOptions(screen.getByTestId('holding-form-instrument'), 'i1');
    await user.type(screen.getByTestId('holding-form-quantity'), '10');
    await user.click(screen.getByTestId('holding-form-submit'));

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/holdings').flush(null, { status: 422, statusText: 'Unprocessable' }),
    );

    expect(await screen.findByTestId('holding-form-error')).toBeInTheDocument();
    expect(savedForm).not.toHaveBeenCalled();
  });
});
