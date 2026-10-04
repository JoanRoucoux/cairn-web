import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { delayedState } from '@joanroucoux/cairn-ui/async';
import { UiAvatar } from '@joanroucoux/cairn-ui/avatar';
import { UiBackLink } from '@joanroucoux/cairn-ui/back-link';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { UiRow, UiRowTile } from '@joanroucoux/cairn-ui/row';
import { type SegmentedOption, UiSegmented } from '@joanroucoux/cairn-ui/segmented';
import { UiSkeleton } from '@joanroucoux/cairn-ui/skeleton';
import { UiSwitch } from '@joanroucoux/cairn-ui/switch';
import { UiTable, UiTd, UiTh } from '@joanroucoux/cairn-ui/table';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import { LucideChevronRight, LucideDownload, LucideFileText, LucideLogOut, LucideUpload } from '@lucide/angular';

import { SignInRedirect } from '@core/interceptors/sign-in-redirect';
import { THEME_PREFERENCES, type ThemePreference } from '@core/theme/theme-store';

import { injectToast } from '@shared/feedback/toast';
import { pluralKey } from '@shared/format/plural-key';

import { ProfilePasskeyDeleteDialog } from './passkey-delete-dialog/profile-passkey-delete-dialog';
import { ProfilePasskeyDialog } from './passkey-dialog/profile-passkey-dialog';
import { ProfilePasskeyList } from './passkey-list/profile-passkey-list';
import { PortfolioImportStore } from './portfolio-import-store';
import { type PasskeyView, ProfileStore } from './profile-store';

@Component({
  selector: 'app-profile-page',
  imports: [
    UiAlert,
    UiAvatar,
    UiBackLink,
    UiCard,
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
    UiRowTile,
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
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);
  #signIn = inject(SignInRedirect);
  #toast = injectToast();

  protected readonly identityState = this.#store.identityState;
  protected readonly identityShown = delayedState(this.identityState);
  protected readonly passkeysState = this.#store.passkeysState;
  protected readonly owner = this.#store.owner;
  protected readonly username = this.#store.username;
  protected readonly signInMethod = this.#store.signInMethod;
  protected readonly passkeys = this.#store.passkeys;
  protected readonly addedPasskeyIds = this.#store.addedPasskeyIds;
  protected readonly theme = this.#store.theme;
  protected readonly systemScheme = this.#store.systemScheme;
  protected readonly language = this.#store.language;
  protected readonly hideAmounts = this.#store.hideAmounts;

  protected readonly passkeyDialogOpen = signal(false);
  protected readonly passkeyToDelete = signal<PasskeyView | undefined>(undefined);

  #importStore = inject(PortfolioImportStore);
  protected readonly importing = this.#importStore.importing;
  protected readonly rejections = this.#importStore.rejections;
  protected readonly failed = this.#importStore.failed;

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

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Resets the input so picking the same corrected file again still fires a change event.
    input.value = '';

    if (!file) {
      return;
    }

    const report = await this.#importStore.importFile(file);

    if (report) {
      const count = report.holdingsCreated + report.holdingsUpdated;

      this.#toast(pluralKey('profile.toasts.imported', count), { count });
    }
  }

  protected onPasskeyRegistered(): void {
    this.passkeyDialogOpen.set(false);
    this.#store.passkeyAdded();
  }

  protected onPasskeyDeleted(): void {
    this.passkeyToDelete.set(undefined);
    this.#store.reloadPasskeys();
    afterNextRender(
      () => this.#host.nativeElement.querySelector<HTMLElement>('[data-testid="manage-passkeys"]')?.focus(),
      { injector: this.#injector },
    );
  }

  protected retryPasskeys(): void {
    this.#store.reloadPasskeys();
  }

  protected async onSignOut(): Promise<void> {
    await this.#store.signOut();
    // A full page load, not a router navigation: the app would keep rendering the destroyed session.
    this.#signIn.start();
  }
}
