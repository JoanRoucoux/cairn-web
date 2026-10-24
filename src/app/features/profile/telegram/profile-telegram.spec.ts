import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UiToasts } from '@joanroucoux/cairn-ui/toast';
import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { ProfileTelegram } from './profile-telegram';

const INVITATION_URL = 'https://t.me/cairn_bot?start=abc';
const LINK = '/api/session/telegram/link';
const CHECK = '/api/session/telegram/link/check';
const linked = { status: 'linked', chatLabel: '@alex', linkedAt: '2026-10-24T09:00:00Z' };

const translations = {
  'profile.telegram.title': 'Telegram',
  'profile.telegram.hint': 'Receive the recaps in Telegram.',
  'profile.telegram.unavailable': 'No Telegram bot is configured on the server.',
  'profile.telegram.connect': 'Connect Telegram',
  'profile.telegram.open': 'Open Telegram',
  'profile.telegram.pending': 'Press Start in Telegram.',
  'profile.telegram.fallback': 'Telegram does not open? Send this message to @{{bot}}:',
  'profile.telegram.command': 'Message to send',
  'profile.telegram.copy': 'Copy the message',
  'profile.telegram.expired': 'The link expired. Try again.',
  'profile.telegram.linked': 'Connected to {{label}} since {{date}}',
  'profile.telegram.disconnect': 'Disconnect',
  'profile.telegram.error': 'Telegram could not be reached. Try again.',
  'profile.toasts.telegramLinked': 'Telegram connected',
  'profile.toasts.telegramUnlinked': 'Telegram disconnected',
  'profile.toasts.telegramCopied': 'Message copied',
  'profile.toasts.telegramCopyFailed': 'The message could not be copied. Select it instead.',
  'profile.toasts.telegramDisconnectFailed': 'Telegram could not be disconnected. Try again.',
};

describe('ProfileTelegram', () => {
  let httpTesting: HttpTestingController;
  const show = vi.fn();
  const showError = vi.fn();

  const renderSection = async (body: object): Promise<void> => {
    await render(ProfileTelegram, {
      imports: [getTranslocoTestingModule({ langs: { en: translations } })],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('profile'),
        { provide: UiToasts, useValue: { show, showError } },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/session/telegram').flush(body);
  };

  const connect = async (expiresAt: string, url = INVITATION_URL): Promise<void> => {
    const user = userEvent.setup({ delay: null });
    await renderSection({ status: 'unlinked' });
    const button = await screen.findByRole('button', { name: 'Connect Telegram' });
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
      shouldClearNativeTimers: true,
    });
    await user.click(button);
    const request = await vi.waitFor(() => httpTesting.expectOne({ method: 'POST', url: LINK }));

    request.flush({ url, expiresAt });
    await vi.waitFor(() => {
      TestBed.tick();
      expect(screen.getByRole('link', { name: 'Open Telegram' })).toBeInTheDocument();
    });
  };

  const pollOnce = async (body: object | null, status = 200): Promise<void> => {
    await vi.advanceTimersByTimeAsync(3000);
    httpTesting.expectOne(CHECK).flush(body, { status, statusText: 'Answer' });
    await vi.advanceTimersByTimeAsync(0);
    vi.useRealTimers();
  };

  afterEach(() => {
    httpTesting.verify();
    vi.useRealTimers();
    show.mockClear();
    showError.mockClear();
  });

  it('should explain that no bot is configured', async () => {
    await renderSection({ status: 'unavailable' });

    expect(await screen.findByText('No Telegram bot is configured on the server.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should offer to connect when unlinked', async () => {
    await renderSection({ status: 'unlinked' });

    expect(await screen.findByRole('button', { name: 'Connect Telegram' })).toBeInTheDocument();
    expect(screen.queryByText('The link expired. Try again.')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should open the invitation in a new tab once connecting', async () => {
    await connect('2099-01-01T00:00:00Z');

    const open = screen.getByRole('link', { name: 'Open Telegram' });

    expect(open).toHaveAttribute('href', INVITATION_URL);
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Press Start in Telegram.')).toBeInTheDocument();
  });

  it('should show the fallback command with the bot name while pending', async () => {
    await connect('2099-01-01T00:00:00Z');

    expect(screen.getByText('Telegram does not open? Send this message to @cairn_bot:')).toBeInTheDocument();
    const command = screen.getByRole('textbox', { name: 'Message to send' });

    expect(command).toHaveValue('/start abc');
    expect(command).toHaveAttribute('readonly');
  });

  it('should hide the fallback when the invitation carries no token', async () => {
    await connect('2099-01-01T00:00:00Z', 'https://t.me/cairn_bot');

    expect(screen.getByRole('link', { name: 'Open Telegram' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy the message' })).not.toBeInTheDocument();
  });

  it('should copy the command and toast', async () => {
    await connect('2099-01-01T00:00:00Z');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    screen.getByRole('button', { name: 'Copy the message' }).click();

    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Message copied'));
    expect(writeText).toHaveBeenCalledWith('/start abc');
  });

  it('should toast an error when the command cannot be copied', async () => {
    await connect('2099-01-01T00:00:00Z');
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });

    screen.getByRole('button', { name: 'Copy the message' }).click();

    await vi.waitFor(() =>
      expect(showError).toHaveBeenCalledWith('The message could not be copied. Select it instead.', 'dialog.close'),
    );
  });

  it('should toast an error when the clipboard is missing', async () => {
    await connect('2099-01-01T00:00:00Z');
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

    screen.getByRole('button', { name: 'Copy the message' }).click();

    await vi.waitFor(() => expect(showError).toHaveBeenCalled());
  });

  it('should offer to connect again when a token is pending but its link is lost', async () => {
    await renderSection({ status: 'pending' });

    expect(await screen.findByRole('button', { name: 'Connect Telegram' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Telegram' })).not.toBeInTheDocument();
    expect(screen.queryByText('Press Start in Telegram.')).not.toBeInTheDocument();
  });

  it('should show the alert and offer to connect again when a check fails', async () => {
    await connect('2099-01-01T00:00:00Z');

    await pollOnce(null, 502);

    expect(await screen.findByRole('alert')).toHaveTextContent('Telegram could not be reached. Try again.');
    expect(screen.getByRole('button', { name: 'Connect Telegram' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Telegram' })).not.toBeInTheDocument();
  });

  it('should show the alert when the first read fails', async () => {
    await render(ProfileTelegram, {
      imports: [getTranslocoTestingModule({ langs: { en: translations } })],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('profile'),
        { provide: UiToasts, useValue: { show, showError } },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.expectOne('/api/session/telegram').flush(null, { status: 500, statusText: 'Error' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Telegram could not be reached. Try again.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should show the linked chat and disconnect it', async () => {
    const user = userEvent.setup();
    await renderSection(linked);

    expect(await screen.findByText(/Connected to @alex since/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    const request = await vi.waitFor(() => httpTesting.expectOne({ method: 'DELETE', url: LINK }));
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(await screen.findByRole('button', { name: 'Connect Telegram' })).toBeInTheDocument();
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Telegram disconnected'));
  });

  it('should toast an error when the disconnection fails', async () => {
    const user = userEvent.setup();
    await renderSection(linked);

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }));
    const request = await vi.waitFor(() => httpTesting.expectOne({ method: 'DELETE', url: LINK }));
    request.flush(null, { status: 500, statusText: 'Error' });

    await vi.waitFor(() =>
      expect(showError).toHaveBeenCalledWith('Telegram could not be disconnected. Try again.', 'dialog.close'),
    );
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should show an alert when Telegram fails to answer the connection', async () => {
    const user = userEvent.setup();
    await renderSection({ status: 'unlinked' });

    await user.click(await screen.findByRole('button', { name: 'Connect Telegram' }));
    const request = await vi.waitFor(() => httpTesting.expectOne({ method: 'POST', url: LINK }));
    request.flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Telegram could not be reached. Try again.');
    expect(screen.getByRole('button', { name: 'Connect Telegram' })).toBeInTheDocument();
  });

  it('should toast and show the chat once the poll finds it linked', async () => {
    await connect('2099-01-01T00:00:00Z');

    await pollOnce(linked);

    expect(await screen.findByText(/Connected to @alex since/)).toBeInTheDocument();
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('Telegram connected'));
  });

  it('should tell that the link expired', async () => {
    await connect('2000-01-01T00:00:00Z');

    await pollOnce({ status: 'unlinked' });

    expect(await screen.findByText('The link expired. Try again.')).toBeInTheDocument();
  });
});
