import { provideZonelessChangeDetection } from '@angular/core';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { PasskeyCeremony, type PasskeyOutcome } from '@core/webauthn/passkey-ceremony';

import { slowDialogExit } from '@shared/testing/dialog-exit';
import { expectSubmitting } from '@shared/testing/submitting';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { ProfilePasskeyDialog } from './profile-passkey-dialog';

describe('ProfilePasskeyDialog', () => {
  const registered = vi.fn();
  const dismissed = vi.fn();
  let register: ReturnType<typeof vi.fn<() => Promise<PasskeyOutcome>>>;

  const renderDialog = async (): Promise<void> => {
    register = vi.fn();
    await render(ProfilePasskeyDialog, {
      on: { registered, dismissed },
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideTranslocoScope('profile'),
        { provide: PasskeyCeremony, useValue: { register } },
      ],
    });
  };

  afterEach(() => {
    registered.mockClear();
    dismissed.mockClear();
  });

  it('should render open on first render', async () => {
    await renderDialog();

    expect(screen.getByTestId('profile-passkey-dialog')).toBeInTheDocument();
  });

  it('should emit dismissed on cancel', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();

    await user.click(screen.getByTestId('passkey-cancel'));

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('puts the initial focus on the first field, not on the close cross', async () => {
    await renderDialog();

    expect(screen.getByTestId('passkey-label')).toHaveFocus();
  });

  it('should emit dismissed when the native dialog closes', async () => {
    await renderDialog();
    slowDialogExit();

    (screen.getByRole('dialog') as HTMLDialogElement).close();

    expect(dismissed).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(dismissed).toHaveBeenCalledTimes(1));
  });

  it('should require a label before running the ceremony', async () => {
    const user = userEvent.setup();
    await renderDialog();

    await user.click(screen.getByTestId('passkey-register'));

    expect(await screen.findByRole('alert')).toHaveTextContent('forms.required');
    expect(register).not.toHaveBeenCalled();
  });

  it('should emit registered once the ceremony succeeds', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();
    register.mockResolvedValue('ok');

    await user.type(screen.getByTestId('passkey-label'), 'iPhone de Joan');
    await user.click(screen.getByTestId('passkey-register'));

    await vi.waitFor(() => expect(registered).toHaveBeenCalledTimes(1));
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('should register on Enter in the label field, with no explicit click', async () => {
    const user = userEvent.setup();
    await renderDialog();
    register.mockResolvedValue('ok');

    await user.type(screen.getByTestId('passkey-label'), 'iPhone de Joan{Enter}');

    await vi.waitFor(() => expect(registered).toHaveBeenCalled());
  });

  it('should trim the label before running the ceremony', async () => {
    const user = userEvent.setup();
    await renderDialog();
    register.mockResolvedValue('ok');

    await user.type(screen.getByTestId('passkey-label'), '  iPhone  ');
    await user.click(screen.getByTestId('passkey-register'));

    await vi.waitFor(() => expect(register).toHaveBeenCalledWith('iPhone'));
  });

  it('should show no message and stay open when the ceremony is dismissed', async () => {
    const user = userEvent.setup();
    await renderDialog();
    slowDialogExit();
    register.mockResolvedValue('cancelled');

    await user.type(screen.getByTestId('passkey-label'), 'iPhone de Joan');
    await user.click(screen.getByTestId('passkey-register'));

    await vi.waitFor(() => expect(register).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(registered).not.toHaveBeenCalled();
    expect(screen.getByTestId('profile-passkey-dialog')).toBeInTheDocument();
  });

  it('should say so when the browser cannot use passkeys', async () => {
    const user = userEvent.setup();
    await renderDialog();
    register.mockResolvedValue('unsupported');

    await user.type(screen.getByTestId('passkey-label'), 'iPhone de Joan');
    await user.click(screen.getByTestId('passkey-register'));

    expect(await screen.findByTestId('passkey-unsupported')).toBeInTheDocument();
  });

  it('should say so when the ceremony breaks down', async () => {
    const user = userEvent.setup();
    await renderDialog();
    register.mockResolvedValue('failed');

    await user.type(screen.getByTestId('passkey-label'), 'iPhone de Joan');
    await user.click(screen.getByTestId('passkey-register'));

    expect(await screen.findByTestId('passkey-failed')).toBeInTheDocument();
  });

  it('should spin the register button and keep the dialog busy while the ceremony is running', async () => {
    const user = userEvent.setup();
    await renderDialog();
    let resolveRegister!: (outcome: PasskeyOutcome) => void;
    register.mockReturnValue(new Promise((resolve) => (resolveRegister = resolve)));

    await user.type(screen.getByTestId('passkey-label'), 'iPhone de Joan');
    await user.click(screen.getByTestId('passkey-register'));

    expect(await screen.findByTestId('passkey-register')).toBeDisabled();
    expectSubmitting(screen.getByTestId('passkey-register'));

    resolveRegister('ok');
    await vi.waitFor(() => expect(registered).toHaveBeenCalled());
  });
});
