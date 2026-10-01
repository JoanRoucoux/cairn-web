import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  type SegmentedOption,
  UiButton,
  UiRow,
  UiSegmented,
  UiSkeleton,
  UiSwitch,
  UiTable,
  UiTd,
  UiTh,
} from '@joanroucoux/cairn-ui';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import {
  LucideBook,
  LucideChevronLeft,
  LucideChevronRight,
  LucideDownload,
  LucideFileText,
  LucideLogOut,
  LucideUpload,
} from '@lucide/angular';

import { SignInRedirect } from '@core/interceptors/sign-in-redirect';
import { THEME_PREFERENCES, type ThemePreference } from '@core/theme/theme-store';

import { ProfilePasskeyDeleteDialog } from './passkey-delete-dialog/profile-passkey-delete-dialog';
import { ProfilePasskeyDialog } from './passkey-dialog/profile-passkey-dialog';
import { ProfilePasskeyList } from './passkey-list/profile-passkey-list';
import { PortfolioImportStore } from './portfolio-import-store';
import { type PasskeyView, ProfileStore } from './profile-store';

@Component({
  selector: 'app-profile-page',
  imports: [
    LucideBook,
    LucideChevronLeft,
    LucideChevronRight,
    LucideDownload,
    LucideFileText,
    LucideLogOut,
    LucideUpload,
    ProfilePasskeyDeleteDialog,
    ProfilePasskeyDialog,
    ProfilePasskeyList,
    RouterLink,
    TranslocoPipe,
    UiRow,
    UiButton,
    UiSegmented,
    UiSkeleton,
    UiSwitch,
    UiTable,
    UiTd,
    UiTh,
  ],
  templateUrl: './profile-page.html',
  providers: [ProfileStore, PortfolioImportStore],
})
export class ProfilePage {
  #store = inject(ProfileStore);
  #signIn = inject(SignInRedirect);

  protected readonly state = this.#store.state;
  protected readonly owner = this.#store.owner;
  protected readonly username = this.#store.username;
  protected readonly signInMethod = this.#store.signInMethod;
  protected readonly passkeys = this.#store.passkeys;
  protected readonly theme = this.#store.theme;
  protected readonly systemScheme = this.#store.systemScheme;
  protected readonly language = this.#store.language;
  protected readonly hideAmounts = this.#store.hideAmounts;
  protected readonly instrumentCount = this.#store.instrumentCount;

  protected readonly passkeyDialogOpen = signal(false);
  protected readonly passkeyToDelete = signal<PasskeyView | undefined>(undefined);

  #importStore = inject(PortfolioImportStore);
  protected readonly importing = this.#importStore.importing;
  protected readonly report = this.#importStore.report;
  protected readonly rejections = this.#importStore.rejections;
  protected readonly failed = this.#importStore.failed;

  // Scope-relative keys: translateSignal resolves the injected TRANSLOCO_SCOPE itself,
  // and reacts to both scope-load completion and language change.
  #themeLabels = translateSignal(THEME_PREFERENCES.map((value) => `theme.${value}`));

  protected readonly themeOptions = computed<SegmentedOption[]>(() =>
    THEME_PREFERENCES.map((value, index) => ({ value, label: this.#themeLabels()[index]! })),
  );

  #languageLabels = translateSignal(this.#store.availableLanguages.map((lang) => `language.${lang}`));

  protected readonly languageOptions = computed<SegmentedOption[]>(() =>
    this.#store.availableLanguages.map((value, index) => ({ value, label: this.#languageLabels()[index]! })),
  );

  protected onThemeChange(preference: string): void {
    this.#store.setTheme(preference as ThemePreference);
  }

  protected onLanguageChange(lang: string): void {
    this.#store.setLanguage(lang);
  }

  protected onHideAmountsChange(event: Event): void {
    this.#store.setHideAmounts((event.target as HTMLInputElement).checked);
  }

  // Resets the input so picking the same corrected file again still fires a change event.
  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (file) {
      await this.#importStore.importFile(file);
    }
  }

  protected onPasskeyRegistered(): void {
    this.passkeyDialogOpen.set(false);
    this.#store.reloadPasskeys();
  }

  protected retry(): void {
    this.#store.reloadSession();
  }

  // Navigation stays in the page: the store returns, the page decides where to go.
  protected async onSignOut(): Promise<void> {
    await this.#store.signOut();
    // A full page load, not a router navigation: the server session is gone, so the application
    // has to restart rather than keep rendering the one it still holds in memory.
    this.#signIn.start();
  }
}
