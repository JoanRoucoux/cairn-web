import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import type { InstrumentDetailResponse } from '@core/api-client/cairnAPI.schemas';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { InstrumentDeleteDialog } from './instrument-delete-dialog';

describe('InstrumentDeleteDialog', () => {
  let httpTesting: HttpTestingController;
  const deleted = vi.fn();
  const dismissed = vi.fn();

  const instrument = {
    id: 'i1',
    name: 'BNP Paribas Easy S&P 500',
    holdingCount: 2,
  } as InstrumentDetailResponse;

  const renderDialog = async (): Promise<void> => {
    await render(InstrumentDeleteDialog, {
      inputs: { instrument },
      on: { deleted, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('instruments'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpTesting.verify();
    deleted.mockClear();
    dismissed.mockClear();
  });

  it('should name the instrument being deleted', async () => {
    await renderDialog();

    expect(screen.getByTestId('instrument-delete-dialog')).toBeInTheDocument();
  });

  it('should emit dismissed on cancel', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('instrument-delete-cancel'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('should emit dismissed when the native dialog closes', async () => {
    await renderDialog();

    screen.getByRole('dialog').dispatchEvent(new Event('close'));

    expect(dismissed).toHaveBeenCalled();
  });

  it('should emit deleted once the instrument is removed', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('instrument-delete-confirm'));

    await vi.waitFor(() => httpTesting.expectOne('/api/instruments/i1').flush(null));
    await vi.waitFor(() => expect(deleted).toHaveBeenCalled());
  });

  it('should stay open and show an error when the API refuses', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('instrument-delete-confirm'));

    await vi.waitFor(() =>
      httpTesting.expectOne('/api/instruments/i1').flush(null, { status: 500, statusText: 'Server error' }),
    );

    expect(await screen.findByTestId('instrument-delete-error')).toBeInTheDocument();
    expect(deleted).not.toHaveBeenCalled();
  });
});
