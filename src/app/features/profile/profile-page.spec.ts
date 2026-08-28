import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { ProfilePage } from './profile-page';
import { ProfileStore } from './profile-store';

const session = {
  displayName: 'Joan Roucoux',
  initials: 'JR',
  passkeys: [
    { credentialId: 'aXBob25l', label: 'iPhone de Joan', createdAt: '2026-02-01T10:00:00Z', lastUsedAt: null },
    {
      credentialId: 'bWFj',
      label: 'MacBook',
      createdAt: '2026-02-02T10:00:00Z',
      lastUsedAt: '2026-02-10T10:00:00Z',
    },
  ],
};

describe('ProfilePage', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (translations = getTranslocoTestingModule()): Promise<void> => {
    localStorage.clear();
    await render(ProfilePage, {
      imports: [translations],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('profile'),
        ProfileStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(session);
  };

  afterEach(() => httpTesting.verify());

  it('should name the owner', async () => {
    await renderPage();

    expect(await screen.findByText('Joan Roucoux')).toBeInTheDocument();
  });

  it('should list the registered devices', async () => {
    await renderPage();

    expect(await screen.findByText('iPhone de Joan')).toBeInTheDocument();
    expect(screen.getAllByTestId('revoke-passkey')).toHaveLength(2);
  });

  it('should send passkey registration to Spring Security rather than reimplementing it', async () => {
    await renderPage();

    expect(screen.getByTestId('manage-passkeys')).toHaveAttribute('href', '/webauthn/register');
  });

  it('should revoke a device', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click((await screen.findAllByTestId('revoke-passkey'))[1]!);

    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/bWFj'))).flush(null);
    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(session);
  });

  it('should say so when the server refuses to revoke the last device', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click((await screen.findAllByTestId('revoke-passkey'))[0]!);

    (await vi.waitFor(() => httpTesting.expectOne('/api/session/passkeys/aXBob25l'))).flush(null, {
      status: 409,
      statusText: 'Conflict',
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('profile.revokeRefused');
  });

  it('should hand the export to the browser as a download', async () => {
    await renderPage();

    const link = screen.getByTestId('export-csv');

    expect(link).toHaveAttribute('href', '/api/holdings/export');
    expect(link).toHaveAttribute('download');
  });

  it('should offer the three theme preferences', async () => {
    await renderPage();

    expect(await screen.findAllByRole('radio')).toHaveLength(3);
  });

  it('should apply a chosen theme to the document', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'profile.theme.dark' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('should link out to accounts and instruments management', async () => {
    await renderPage();

    expect(await screen.findByRole('link', { name: 'profile.manageData.accounts' })).toHaveAttribute(
      'href',
      '/comptes',
    );
    expect(screen.getByRole('link', { name: 'profile.manageData.instruments' })).toHaveAttribute(
      'href',
      '/instruments',
    );
  });

  it('should sign the user out', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('sign-out'));

    await vi.waitFor(() => httpTesting.expectOne('/logout').flush(null));
  });

  it('should re-translate the theme options when the active language changes', async () => {
    await renderPage(
      getTranslocoTestingModule({
        langs: { en: { 'profile.theme.dark': 'Dark' }, fr: { 'profile.theme.dark': 'Sombre' } },
      }),
    );

    expect(await screen.findByRole('radio', { name: 'Dark' })).toBeInTheDocument();

    TestBed.inject(TranslocoService).setActiveLang('fr');
    TestBed.tick();

    expect(await screen.findByRole('radio', { name: 'Sombre' })).toBeInTheDocument();
  });
});
