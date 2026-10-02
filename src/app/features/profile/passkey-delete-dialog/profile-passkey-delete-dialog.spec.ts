import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { slowDialogExit } from '@shared/testing/dialog-exit';
import { expectSubmitting } from '@shared/testing/submitting';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import type { PasskeyView } from '../profile-store';
import { ProfilePasskeyDeleteDialog } from './profile-passkey-delete-dialog';

const passkey: PasskeyView = {
  credentialId: 'bWFj',
  label: 'MacBook Air',
  current: false,
  provider: null,
  created: '12/03/2025',
  usage: { kind: 'yesterday', date: '' },
};

describe('ProfilePasskeyDeleteDialog', () => {
  let httpTesting: HttpTestingController;
  const deleted = vi.fn();
  const dismissed = vi.fn();

  const renderDialog = async (): Promise<void> => {
    await render(ProfilePasskeyDeleteDialog, {
      inputs: { passkey },
      on: { deleted, dismissed },
      imports: [getTranslocoTestingModule({ langs: { en: { 'profile.delete.title': 'Delete « {{label}} » ?' } } })],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('profile'),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpTesting.verify();
    deleted.mockClear();
    dismissed.mockClear();
  });

  it('should name the key in the question', async () => {
    await renderDialog();

    expect(screen.getByText('Delete « MacBook Air » ?')).toBeInTheDocument();
  });

  it('should emit dismissed on cancel and delete nothing', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.click(screen.getByTestId('passkey-delete-cancel'));

    await vi.waitFor(() => {
      TestBed.tick();
      expect(dismissed).toHaveBeenCalled();
    });
    httpTesting.expectNone('/api/session/passkeys/bWFj');
  });

  it('should emit dismissed when the native dialog closes', async () => {
    await renderDialog();
    slowDialogExit();

    (screen.getByRole('alertdialog') as HTMLDialogElement).close();

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('should emit deleted once the server confirms', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.click(screen.getByTestId('passkey-delete-confirm'));
    await vi.waitFor(() => expectSubmitting(screen.getByTestId('passkey-delete-confirm')));
    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null);

    await vi.waitFor(() => expect(deleted).toHaveBeenCalledTimes(1));
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('should stay open and say so when the server refuses', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('passkey-delete-confirm'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null, {
      status: 409,
      statusText: 'Conflict',
    });

    expect(await screen.findByTestId('passkey-delete-refused')).toBeInTheDocument();
    expect(deleted).not.toHaveBeenCalled();
  });

  it('should say the key could not be deleted when the failure is not the only-key refusal', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('passkey-delete-confirm'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    expect(await screen.findByTestId('passkey-delete-failed')).toBeInTheDocument();
    expect(screen.queryByTestId('passkey-delete-refused')).not.toBeInTheDocument();
  });
});
