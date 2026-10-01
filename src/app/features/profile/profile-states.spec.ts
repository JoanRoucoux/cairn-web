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

const session = {
  displayName: 'Joan',
  initials: 'JO',
  username: 'joan',
  signInMethod: 'PASSKEY',
  passkeys: [{ credentialId: 'aXBob25l', label: 'iPhone de Joan', createdAt: '2025-03-12T10:00:00Z', current: true }],
};

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

  it('should show no identity while the session loads, then the owner', async () => {
    await renderPage();

    expect(screen.queryByTestId('identity')).not.toBeInTheDocument();
    expect(screen.queryByTestId('revoke-passkey')).not.toBeInTheDocument();

    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(session);
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush([]);

    expect(await screen.findByTestId('identity')).toBeInTheDocument();
  });

  it('should retry the session when the keys could not be loaded', async () => {
    const user = userEvent.setup();
    await renderPage();
    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(null, { status: 500, statusText: 'Error' });
    (await vi.waitFor(() => httpTesting.expectOne('/api/instruments'))).flush([]);

    expect(await screen.findByText('profile.passkeysErrorTitle')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'profile.title' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'profile.retry' }));

    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(session);
    expect(await screen.findByTestId('current-passkey')).toBeInTheDocument();
  });
});
