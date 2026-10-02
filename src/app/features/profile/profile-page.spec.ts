import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UiToasts } from '@joanroucoux/cairn-ui';
import { TRANSLOCO_LOADER, type TranslocoLoader, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { render, screen, within } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { of } from 'rxjs';

import { SignInRedirect } from '@core/interceptors/sign-in-redirect';
import { PasskeyCeremony, type PasskeyOutcome } from '@core/webauthn/passkey-ceremony';

import { recordMotion } from '@shared/testing/motion';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioImportStore } from './portfolio-import-store';
import { ProfilePage } from './profile-page';
import { ProfileStore } from './profile-store';
import { flushCall, passkeys, session, settleProfile } from './profile-testing';

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
  let register: ReturnType<typeof vi.fn<() => Promise<PasskeyOutcome>>>;

  const renderPage = async (
    translations = getTranslocoTestingModule(),
    data: { session?: object; passkeys?: object[] } = {},
  ): Promise<void> => {
    localStorage.clear();
    register = vi.fn();
    await render(ProfilePage, {
      imports: [translations],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('profile'),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: PasskeyCeremony, useValue: { register } },
        ProfileStore,
        PortfolioImportStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    await settleProfile(httpTesting, data);
  };

  afterEach(() => {
    httpTesting.verify();
  });

  it('should name the owner and how the session was opened', async () => {
    await renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Joan' })).toBeInTheDocument();
    expect(screen.getByTestId('identity')).toHaveTextContent('profile.signedIn.PASSKEY');
  });

  it('should word the sign-in line for a password session', async () => {
    await renderPage(getTranslocoTestingModule(), { session: { ...session, signInMethod: 'PASSWORD' } });

    expect(await screen.findByTestId('identity')).toHaveTextContent('profile.signedIn.PASSWORD');
  });

  it('should link back to the portfolio for the mobile layout', async () => {
    await renderPage();

    expect(await screen.findByTestId('back-link')).toHaveAttribute('href', '/');
  });

  it('should show how many instruments the catalogue holds', async () => {
    await renderPage();

    expect(await screen.findByTestId('instrument-count')).toHaveTextContent('3');
  });

  it('should explain which scheme the device is on when following it', async () => {
    await renderPage(
      getTranslocoTestingModule({
        langs: {
          en: { 'profile.themeHint.system': 'Follows the device, now {{scheme}}.', 'profile.scheme.light': 'light' },
        },
      }),
    );

    expect(await screen.findByTestId('theme-hint')).toHaveTextContent('Follows the device, now light.');
  });

  it('should say the scheme is forced once a theme is picked', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'profile.theme.dark' }));

    expect(screen.getByTestId('theme-hint')).toHaveTextContent('profile.themeHint.dark');
  });

  it('should open the passkey dialog', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('manage-passkeys'));

    expect(screen.getByTestId('profile-passkey-dialog')).toBeInTheDocument();
  });

  it('should close the dialog, confirm, then reload and highlight the passkey just registered', async () => {
    const motion = recordMotion();
    onTestFinished(() => motion.restore());
    const user = userEvent.setup();
    await renderPage();
    register.mockResolvedValue('ok');
    const show = vi.spyOn(TestBed.inject(UiToasts), 'show');

    await user.click(screen.getByTestId('manage-passkeys'));
    await user.type(screen.getByTestId('passkey-label'), 'iPad');
    await user.click(screen.getByTestId('passkey-register'));

    await vi.waitFor(() => expect(screen.queryByTestId('profile-passkey-dialog')).not.toBeInTheDocument());
    expect(show).toHaveBeenCalledExactlyOnceWith('profile.toasts.passkeyAdded');

    await flushCall(httpTesting, '/api/session/passkeys', [
      ...passkeys,
      { credentialId: 'aVBhZA', label: 'iPad', createdAt: '2026-09-25T15:00:00Z', lastUsedAt: null, current: false },
    ]);

    expect(await screen.findByTestId('added-passkey')).toHaveTextContent('iPad');
    await vi.waitFor(() => expect(motion.highlighted).toEqual([screen.getByTestId('added-passkey')]));
  });

  it('should close the passkey dialog when dismissed', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId('manage-passkeys'));
    await user.click(screen.getByTestId('passkey-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('profile-passkey-dialog')).not.toBeInTheDocument());
    expect(TestBed.inject(UiToasts).toast()).toBeNull();
  });

  it('should ask before deleting a device, and delete nothing on cancel', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click((await screen.findAllByTestId('revoke-passkey'))[1]!);

    expect(await screen.findByTestId('profile-passkey-delete-dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('passkey-delete-cancel'));

    await vi.waitFor(() => {
      TestBed.tick();
      expect(screen.queryByTestId('profile-passkey-delete-dialog')).not.toBeInTheDocument();
    });
    httpTesting.expectNone('/api/session/passkeys/bWFj');
  });

  it('should delete a device once confirmed, then close the dialog', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click((await screen.findAllByTestId('revoke-passkey'))[1]!);
    await user.click(await screen.findByTestId('passkey-delete-confirm'));

    await flushCall(httpTesting, '/api/session/passkeys/bWFj', null);
    await flushCall(httpTesting, '/api/session/passkeys', []);
    httpTesting.expectNone('/api/session');

    await vi.waitFor(() => expect(screen.queryByTestId('profile-passkey-delete-dialog')).not.toBeInTheDocument());
    await vi.waitFor(() => expect(screen.getByTestId('manage-passkeys')).toHaveFocus());
    expect(TestBed.inject(UiToasts).toast()?.text).toBe('profile.toasts.passkeyDeleted');
  });

  it('should offer the three theme preferences', async () => {
    await renderPage();

    expect(await screen.findByRole('radiogroup', { name: 'profile.themeLabel' })).toBeInTheDocument();
    expect(within(screen.getByRole('radiogroup', { name: 'profile.themeLabel' })).getAllByRole('radio')).toHaveLength(
      3,
    );
  });

  it('should offer both languages and switch to the one that is picked', async () => {
    const user = userEvent.setup();
    await renderPage();

    const group = await screen.findByRole('radiogroup', { name: 'profile.languageLabel' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.textContent?.trim()),
    ).toEqual(['profile.language.fr', 'profile.language.en']);

    await user.click(within(group).getByRole('radio', { name: 'profile.language.fr' }));

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('fr');
  });

  it('should apply a chosen theme to the document', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole('radio', { name: 'profile.theme.dark' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('should link out to the instrument catalog, accounts having moved to the navigation', async () => {
    await renderPage();

    expect(await screen.findByTestId('manage-instruments')).toHaveAttribute('href', '/instruments');
    expect(screen.queryByTestId('manage-accounts')).not.toBeInTheDocument();
  });

  it('should reflect and change the stored hide-amounts preference', async () => {
    const user = userEvent.setup();
    await renderPage();

    const toggle = await screen.findByTestId('hide-amounts');
    expect(toggle).not.toBeChecked();

    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(localStorage.getItem('cairn-hide-amounts')).toBe('1');
  });

  it('should send the browser to the sign-in page after signing out, not navigate in place', async () => {
    const user = userEvent.setup();
    await renderPage();
    const signIn = vi.spyOn(TestBed.inject(SignInRedirect), 'start');

    await user.click(screen.getByTestId('sign-out'));
    await vi.waitFor(() => httpTesting.expectOne('/logout').flush(null));

    // A router navigation would leave the application running on a session the server has just
    // destroyed, showing the previous user's name until something happens to fail.
    await vi.waitFor(() => expect(signIn).toHaveBeenCalled());
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
    await settleProfile(httpTesting);

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
