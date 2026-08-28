import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { type SegmentedOption, UiAvatar, UiButton, UiCard, UiSegmented } from 'cairn-ui';

import { THEME_PREFERENCES, type ThemePreference } from '@core/theme/theme-store';

import { RelativeDatePipe } from '@shared/format/relative-date-pipe';

import { ProfileStore } from './profile-store';

@Component({
  selector: 'app-profile-page',
  imports: [RelativeDatePipe, RouterLink, TranslocoPipe, UiAvatar, UiButton, UiCard, UiSegmented],
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  #store = inject(ProfileStore);
  #router = inject(Router);
  #transloco = inject(TranslocoService);

  protected readonly owner = this.#store.owner;
  protected readonly passkeys = this.#store.passkeys;
  protected readonly revocationRefused = this.#store.revocationRefused;
  protected readonly theme = this.#store.theme;

  protected readonly themeOptions = computed<SegmentedOption[]>(() => {
    this.#transloco.activeLang();
    return THEME_PREFERENCES.map((value) => ({ value, label: this.#transloco.translate(`profile.theme.${value}`) }));
  });

  protected onThemeChange(preference: string): void {
    this.#store.setTheme(preference as ThemePreference);
  }

  protected async onRevoke(credentialId: string): Promise<void> {
    await this.#store.revokePasskey(credentialId);
  }

  // Navigation stays in the page: the store returns, the page decides where to go.
  protected async onSignOut(): Promise<void> {
    await this.#store.signOut();
    await this.#router.navigateByUrl('/');
  }
}
