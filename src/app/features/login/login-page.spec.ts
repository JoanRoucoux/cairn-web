import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { PageLoad } from '@core/navigation/page-load';
import { PasskeyCeremony, type PasskeyOutcome } from '@core/webauthn/passkey-ceremony';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { LoginPage } from './login-page';
import { LoginStore } from './login-store';

describe('LoginPage', () => {
  let httpTesting: HttpTestingController;
  let load: ReturnType<typeof vi.spyOn>;
  let authenticate: ReturnType<typeof vi.fn<() => Promise<PasskeyOutcome>>>;

  beforeEach(() => {
    authenticate = vi.fn();
  });

  const renderPage = async (): Promise<void> => {
    await render(LoginPage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('login'),

        { provide: PasskeyCeremony, useValue: { authenticate } },
        LoginStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    load = vi.spyOn(TestBed.inject(PageLoad), 'to');
  };

  afterEach(() => httpTesting.verify());

  const fillIn = async (user: ReturnType<typeof userEvent.setup>, password: string): Promise<void> => {
    await user.click(screen.getByTestId('login-password-toggle'));
    await user.type(screen.getByTestId('login-username'), 'joan');
    await user.type(screen.getByTestId('login-password'), password);
    await user.click(screen.getByTestId('login-submit'));
  };

  it('should reload the application once the session is open', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillIn(user, 'a-real-password');
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    // A router navigation would leave the application running without the session it just opened.
    await vi.waitFor(() => expect(load).toHaveBeenCalledWith('/'));
  });

  it('should say so when the password is refused, and stay put', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillIn(user, 'wrong');
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(await screen.findByTestId('login-refused')).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it('should send no request when submitted empty', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('login-password-toggle'));
    await user.click(screen.getByTestId('login-submit'));

    httpTesting.expectNone('/api/authenticate');
  });

  it('says which field is missing instead of refusing in silence', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('login-password-toggle'));
    await user.click(screen.getByTestId('login-submit'));

    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('forms.required');
    httpTesting.expectNone('/api/authenticate');
  });

  it('should tell a breakdown apart from a refusal', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillIn(user, 'a-real-password');
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    expect(await screen.findByTestId('login-failed')).toBeInTheDocument();
    expect(screen.queryByTestId('login-refused')).not.toBeInTheDocument();
  });

  it('should reload the application once the passkey ceremony succeeds', async () => {
    const user = userEvent.setup();
    authenticate.mockResolvedValue('ok');
    await renderPage();

    await user.click(screen.getByTestId('login-passkey'));

    await vi.waitFor(() => expect(load).toHaveBeenCalledWith('/'));
  });

  it('should block a second ceremony while one is running', async () => {
    const user = userEvent.setup();
    let resolveAuthenticate!: (outcome: PasskeyOutcome) => void;
    authenticate.mockReturnValue(new Promise((resolve) => (resolveAuthenticate = resolve)));
    await renderPage();

    await user.click(screen.getByTestId('login-passkey'));

    await user.click(await screen.findByTestId('login-passkey'));

    expect(authenticate).toHaveBeenCalledTimes(1);

    resolveAuthenticate('ok');
    await vi.waitFor(() => expect(load).toHaveBeenCalledWith('/'));
  });

  it('should explain a dismissed ceremony and offer to try again', async () => {
    const user = userEvent.setup();
    authenticate.mockResolvedValue('cancelled');
    await renderPage();

    await user.click(screen.getByTestId('login-passkey'));

    const alert = await screen.findByTestId('login-passkey-refused');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent('login.passkeyRefusedTitle');
    expect(alert).toHaveTextContent('login.passkeyRefused');
    expect(screen.getByTestId('login-passkey')).toHaveTextContent('login.passkeyRetry');
    expect(load).not.toHaveBeenCalled();
  });

  it('should say so when the passkey is refused', async () => {
    const user = userEvent.setup();
    authenticate.mockResolvedValue('refused');
    await renderPage();

    await user.click(screen.getByTestId('login-passkey'));

    expect(await screen.findByTestId('login-passkey-refused')).toBeInTheDocument();
  });

  it('should say so when the browser cannot use passkeys', async () => {
    const user = userEvent.setup();
    authenticate.mockResolvedValue('unsupported');
    await renderPage();

    await user.click(screen.getByTestId('login-passkey'));

    expect(await screen.findByTestId('login-passkey-unsupported')).toBeInTheDocument();
  });

  it('should say so when the passkey ceremony breaks down', async () => {
    const user = userEvent.setup();
    authenticate.mockResolvedValue('failed');
    await renderPage();

    await user.click(screen.getByTestId('login-passkey'));

    expect(await screen.findByTestId('login-passkey-failed')).toBeInTheDocument();
  });

  it('should move focus to the username field when the password form unfolds', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('login-password-toggle'));
    TestBed.tick();

    await vi.waitFor(() => expect(screen.getByTestId('login-username')).toHaveFocus());
  });

  it('should move focus to the password field after a refusal, keeping the username', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillIn(user, 'wrong');
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
    TestBed.tick();

    await vi.waitFor(() => expect(screen.getByTestId('login-password')).toHaveFocus());
    expect(screen.getByTestId('login-username')).toHaveValue('joan');
  });

  it('should replace the passkey block with the password form, and back', async () => {
    const user = userEvent.setup();
    await renderPage();

    expect(screen.getByTestId('login-passkey-hint')).toBeInTheDocument();
    expect(screen.queryByTestId('login-username')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('login-password-toggle'));

    expect(screen.queryByTestId('login-passkey')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-passkey-hint')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-username')).toBeInTheDocument();

    await user.click(screen.getByTestId('login-passkey-toggle'));

    expect(screen.getByTestId('login-passkey')).toBeInTheDocument();
    expect(screen.queryByTestId('login-username')).not.toBeInTheDocument();
  });

  it('should show and hide the password with the eye toggle', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByTestId('login-password-toggle'));

    const input = screen.getByTestId('login-password');
    const eye = screen.getByTestId('login-password-reveal');
    expect(input).toHaveAttribute('type', 'password');
    expect(eye).toHaveAttribute('aria-pressed', 'false');
    expect(eye).toHaveAccessibleName('login.showPassword');

    await user.click(eye);

    expect(input).toHaveAttribute('type', 'text');
    expect(eye).toHaveAttribute('aria-pressed', 'true');
    expect(eye).toHaveAccessibleName('login.hidePassword');
  });

  it('should put both fields in error under an alert when the password is refused', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillIn(user, 'wrong');
    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    const alert = await screen.findByTestId('login-refused');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent('login.refused');
    expect(screen.getByTestId('login-username')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('login-password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should dim the passkey button and say what to do while the key is awaited', async () => {
    const user = userEvent.setup();
    authenticate.mockReturnValue(new Promise(() => undefined));
    await renderPage();

    await user.click(screen.getByTestId('login-passkey'));

    const button = await screen.findByTestId('login-passkey');
    expect(button).toHaveTextContent('login.passkeySubmitting');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('login-passkey-hint')).toHaveTextContent('login.passkeyWaitingHint');
  });

  it('should let the password form work once shown', async () => {
    const user = userEvent.setup();
    await renderPage();

    await fillIn(user, 'a-real-password');

    (await vi.waitFor(() => httpTesting.expectOne('/api/authenticate'))).flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    await vi.waitFor(() => expect(load).toHaveBeenCalledWith('/'));
  });
});
