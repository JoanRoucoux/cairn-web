import { Component, ElementRef, Injector, afterNextRender, afterRenderEffect, inject, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';

import { UiAlert } from '@joanroucoux/cairn-ui/alert';
import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiField } from '@joanroucoux/cairn-ui/field';
import { UiInput } from '@joanroucoux/cairn-ui/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEye, LucideEyeOff, LucideKeyRound } from '@lucide/angular';

import { PageLoad } from '@core/navigation/page-load';

import { CairnMark } from '@shared/branding/cairn-mark';

import { LoginStore } from './login-store';

@Component({
  selector: 'app-login-page',
  imports: [
    CairnMark,
    FormField,
    LucideEye,
    LucideEyeOff,
    LucideKeyRound,
    TranslocoPipe,
    UiAlert,
    UiButton,
    UiField,
    UiInput,
  ],
  templateUrl: './login-page.html',
  providers: [LoginStore],
})
export class LoginPage {
  #store = inject(LoginStore);
  #pageLoad = inject(PageLoad);

  protected readonly form = this.#store.form;
  protected readonly refused = this.#store.refused;
  protected readonly failed = this.#store.failed;

  protected readonly passkeySubmitting = this.#store.passkeySubmitting;
  protected readonly passkeyRefused = this.#store.passkeyRefused;
  protected readonly passkeyUnsupported = this.#store.passkeyUnsupported;
  protected readonly passkeyFailed = this.#store.passkeyFailed;

  protected readonly passwordMode = signal(false);
  protected readonly passwordShown = signal(false);

  #injector = inject(Injector);
  #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      if (this.passwordMode()) {
        this.#focus('login-username');
      }
    });
    afterRenderEffect(() => {
      if (this.refused()) {
        this.#focus('login-password');
      }
    });
  }

  #focus(testId: string): void {
    this.#host.nativeElement.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)?.focus();
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (this.form().submitting()) {
      return;
    }

    if (!(await this.#store.signIn())) {
      return;
    }

    // A full page load, not a router navigation: the session store must start against the new session.
    this.#pageLoad.to('/');
  }

  protected async onPasskeySignIn(): Promise<void> {
    if (!(await this.#store.signInWithPasskey())) {
      return;
    }

    this.#pageLoad.to('/');
  }

  protected usePassword(): void {
    this.#store.clearPasswordOutcome();
    this.passwordMode.set(true);
  }

  protected usePasskey(): void {
    this.#store.clearPasswordOutcome();
    this.passwordMode.set(false);
    afterNextRender(() => this.#focus('login-passkey'), { injector: this.#injector });
  }

  protected toggleShown(): void {
    this.passwordShown.update((shown) => !shown);
  }
}
