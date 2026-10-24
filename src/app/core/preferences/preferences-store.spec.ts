import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LanguageStore } from '@core/i18n/language-store';
import { ThemeStore } from '@core/theme/theme-store';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PreferencesStore } from './preferences-store';

describe('PreferencesStore', () => {
  let store: PreferencesStore;
  let http: HttpTestingController;

  const load = async (preferences: object): Promise<void> => {
    TestBed.tick();
    (await vi.waitFor(() => http.expectOne('/api/session/preferences'))).flush(preferences);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(PreferencesStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('appliesTheServerLanguageAndThemeOnceLoaded', async () => {
    await load({ language: 'en', theme: 'dark' });

    expect(TestBed.inject(LanguageStore).activeLang()).toBe('en');
    expect(TestBed.inject(ThemeStore).preference()).toBe('dark');
  });

  it('setThemePatchesOnlyTheTheme', async () => {
    await load({ language: 'fr', theme: 'system' });

    const saved = store.setTheme('light');
    const request = await vi.waitFor(() => http.expectOne({ method: 'PATCH', url: '/api/session/preferences' }));
    request.flush({ language: 'fr', theme: 'light' });

    expect(request.request.body).toEqual({ theme: 'light' });
    expect(await saved).toBe(true);
    expect(TestBed.inject(ThemeStore).preference()).toBe('light');
  });

  it('setLanguagePatchesOnlyTheLanguage', async () => {
    await load({ language: 'fr', theme: 'system' });

    const saved = store.setLanguage('en');
    const request = await vi.waitFor(() => http.expectOne({ method: 'PATCH', url: '/api/session/preferences' }));
    request.flush({ language: 'en', theme: 'system' });

    expect(request.request.body).toEqual({ language: 'en' });
    expect(await saved).toBe(true);
    expect(TestBed.inject(LanguageStore).activeLang()).toBe('en');
  });

  it('aFailedPatchRestoresThePreviousThemeAndReturnsFalse', async () => {
    await load({ language: 'fr', theme: 'dark' });

    const saved = store.setTheme('light');

    expect(TestBed.inject(ThemeStore).preference()).toBe('light');

    (await vi.waitFor(() => http.expectOne('/api/session/preferences'))).flush(null, {
      status: 500,
      statusText: 'Error',
    });

    expect(await saved).toBe(false);
    expect(TestBed.inject(ThemeStore).preference()).toBe('dark');
  });

  it('aFailedPatchRestoresThePreviousLanguage', async () => {
    await load({ language: 'fr', theme: 'system' });

    const saved = store.setLanguage('en');

    expect(TestBed.inject(LanguageStore).activeLang()).toBe('en');

    (await vi.waitFor(() => http.expectOne('/api/session/preferences'))).flush(null, {
      status: 500,
      statusText: 'Error',
    });

    expect(await saved).toBe(false);
    expect(TestBed.inject(LanguageStore).activeLang()).toBe('fr');
  });

  it('keepsTheLocalChoicesWhenTheServerCannotBeReached', async () => {
    TestBed.tick();
    (await vi.waitFor(() => http.expectOne('/api/session/preferences'))).flush(null, {
      status: 500,
      statusText: 'Error',
    });
    TestBed.tick();

    expect(TestBed.inject(ThemeStore).preference()).toBe('system');
  });
});
