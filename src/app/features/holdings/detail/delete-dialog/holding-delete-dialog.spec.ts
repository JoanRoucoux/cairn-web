import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { HoldingResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { HoldingDeleteDialog } from './holding-delete-dialog';

const holding = { id: 'h1', instrumentName: 'BNP Paribas Easy S&P 500' } as unknown as HoldingResponse;

describe('HoldingDeleteDialog', () => {
  let httpTesting: HttpTestingController;
  const deleted = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (): Promise<void> => {
    await render(HoldingDeleteDialog, {
      inputs: { holding },
      on: { deleted, dismissed },
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
    deleted.mockClear();
    dismissed.mockClear();
  });

  it('names the holding being deleted', async () => {
    await renderDialog();

    expect(screen.getByTestId('holding-delete-dialog')).toBeInTheDocument();
  });

  it('emits dismissed on cancel', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-delete-cancel'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('emits dismissed when the native dialog closes', async () => {
    await renderDialog();

    (screen.getByRole('alertdialog') as HTMLDialogElement).close();

    expect(dismissed).toHaveBeenCalled();
  });

  it('deletes the holding and emits deleted', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-delete-confirm'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await vi.waitFor(() => expect(deleted).toHaveBeenCalledWith('h1'));
  });

  it('shows a generic error when the API refuses', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('holding-delete-confirm'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/holdings/h1'))).flush(null, {
      status: 500,
      statusText: 'Server error',
    });

    expect(await screen.findByTestId('holding-delete-error')).toBeInTheDocument();
    expect(deleted).not.toHaveBeenCalled();
  });
});
