import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioImportStore } from './portfolio-import-store';
import { ProfilePage } from './profile-page';
import { ProfileStore } from './profile-store';
import { flushCall, passkeys, session, settleProfile } from './profile-testing';

describe('ProfilePage loading states', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (): Promise<void> => {
    localStorage.clear();
    await render(ProfilePage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('profile'),
        ProfileStore,
        PortfolioImportStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  };

  afterEach(() => httpTesting.verify());

  it('should show the identity while the passkeys load, with placeholders for them only', async () => {
    await renderPage();
    await flushCall(httpTesting, '/api/session', session);
    await flushCall(httpTesting, '/api/instruments', []);

    expect(await screen.findByTestId('identity')).toBeInTheDocument();
    expect(screen.queryByTestId('revoke-passkey')).not.toBeInTheDocument();
    await vi.waitFor(() => expect(document.querySelectorAll('ui-skeleton').length).toBeGreaterThan(0));

    await flushCall(httpTesting, '/api/session/passkeys', passkeys);
  });

  it('should keep the identity when the passkeys fail and retry only that call', async () => {
    const user = userEvent.setup();
    await renderPage();
    await flushCall(httpTesting, '/api/session', session);
    await flushCall(httpTesting, '/api/session/passkeys', null, { status: 500 });
    await flushCall(httpTesting, '/api/instruments', []);

    expect(await screen.findByText('profile.passkeysErrorTitle')).toBeInTheDocument();
    expect(screen.getByTestId('identity')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'profile.retry' }));

    await flushCall(httpTesting, '/api/session/passkeys', passkeys);
    httpTesting.expectNone('/api/session');
    expect(await screen.findByTestId('current-passkey')).toBeInTheDocument();
  });

  it('should hide the identity and keep a hidden title when the session fails', async () => {
    await renderPage();
    await flushCall(httpTesting, '/api/session', null, { status: 500 });
    await flushCall(httpTesting, '/api/session/passkeys', passkeys);
    await flushCall(httpTesting, '/api/instruments', []);

    expect(await screen.findByTestId('current-passkey')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'profile.title' })).toBeInTheDocument();
    expect(screen.queryByTestId('identity')).not.toBeInTheDocument();
  });

  it('should title the page while the session loads', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'profile.title' })).toBeInTheDocument();

    await settleProfile(httpTesting);
  });
});
