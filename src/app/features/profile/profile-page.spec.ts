import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TRANSLOCO_LOADER, type TranslocoLoader, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen, within } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { of } from 'rxjs';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioImportStore } from './portfolio-import-store';
import { ProfilePage } from './profile-page';
import { ProfileStore } from './profile-store';

const CSV_HEADER = 'account,accountType,institution,instrument,isinOrTicker,quantity,averageCost';

const csvFile = (): File => new File([`${CSV_HEADER}\r\n`], 'portfolio.csv', { type: 'text/csv' });

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

// Simulates the profile scope's real, asynchronous load: the plain TranslocoTestingModule loader
// resolves scopes synchronously, which cannot reproduce the race between first render and the
// lazy scope finishing loading.
class DeferredScopeLoader implements TranslocoLoader {
  #resolvedLangs: Record<string, Record<string, unknown>>;
  #deferredLangs: string[];
  #resolvers = new Map<string, (translation: Record<string, unknown>) => void>();

  constructor(resolvedLangs: Record<string, Record<string, unknown>>, deferredLangs: string[]) {
    this.#resolvedLangs = resolvedLangs;
    this.#deferredLangs = deferredLangs;
  }

  getTranslation(lang: string): ReturnType<TranslocoLoader['getTranslation']> {
    if (this.#deferredLangs.includes(lang)) {
      return new Promise((resolve) => this.#resolvers.set(lang, resolve));
    }
    return of(this.#resolvedLangs[lang] ?? {});
  }

  resolve(lang: string): void {
    this.#resolvers.get(lang)?.(this.#resolvedLangs[lang] ?? {});
  }
}

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
        PortfolioImportStore,
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

    expect(link).toHaveAttribute('href', '/api/portfolio/export');
    expect(link).toHaveAttribute('download');
  });

  it('should hand the import template to the browser as a download', async () => {
    await renderPage();

    const link = screen.getByTestId('import-template');

    expect(link).toHaveAttribute('href', '/api/portfolio/import/template');
    expect(link).toHaveAttribute('download');
  });

  it('should report what an accepted import changed', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.upload(screen.getByTestId('import-file'), csvFile());

    (await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'))).flush({
      accountsCreated: 1,
      instrumentsCreated: 2,
      holdingsCreated: 3,
      holdingsUpdated: 4,
    });

    expect(await screen.findByTestId('import-report')).toBeInTheDocument();
    expect(screen.queryByTestId('import-rejections')).not.toBeInTheDocument();
  });

  it('should list every refused line so the file can be fixed in one pass', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.upload(screen.getByTestId('import-file'), csvFile());

    (await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'))).flush(
      {
        status: 422,
        errors: [
          { line: 2, code: 'UNKNOWN_ACCOUNT_TYPE', value: 'PEAA' },
          { line: 5, code: 'ZERO_QUANTITY' },
        ],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    const rejections = await screen.findByTestId('import-rejections');

    expect(rejections).toBeInTheDocument();
    expect(await within(rejections).findByText('2')).toBeInTheDocument();
    expect(within(rejections).getByText('5')).toBeInTheDocument();
    expect(screen.queryByTestId('import-report')).not.toBeInTheDocument();
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

  it('should show the translated theme labels once the lazy profile scope finishes loading, not raw i18n keys', async () => {
    const loader = new DeferredScopeLoader(
      {
        en: {},
        fr: {},
        'profile/en': { theme: { dark: 'Dark' } },
        'profile/fr': { theme: { dark: 'Sombre' } },
      },
      ['profile/en', 'profile/fr'],
    );
    localStorage.clear();
    await render(ProfilePage, {
      // Skip preloading (which would await every scope, including the deferred ones, up front)
      // so the profile scope stays genuinely pending after the page has rendered once.
      imports: [getTranslocoTestingModule({ preloadLangs: false })],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('profile'),
        { provide: TRANSLOCO_LOADER, useValue: loader },
        ProfileStore,
        PortfolioImportStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    (await vi.waitFor(() => httpTesting.expectOne('/api/session'))).flush(session);

    expect(screen.queryByRole('radio', { name: 'Dark' })).not.toBeInTheDocument();

    loader.resolve('profile/en');

    await vi.waitFor(() => {
      TestBed.tick();
      expect(screen.getByRole('radio', { name: 'Dark' })).toBeInTheDocument();
    });
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
