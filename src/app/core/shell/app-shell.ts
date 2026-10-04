import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { UiAvatar, UiAvatarLink } from '@joanroucoux/cairn-ui/avatar';
import { UiNavItem } from '@joanroucoux/cairn-ui/nav-item';
import { UiTab, UiTabBar } from '@joanroucoux/cairn-ui/tab-bar';
import { UiToaster } from '@joanroucoux/cairn-ui/toast';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';

import { SessionStore } from '@core/session/session-store';

import { CairnLogo } from './cairn-logo';
import { OfflineBanner } from './offline-banner';
import { ShellDestinationIcon } from './shell-destination-icon';
import { SHELL_DESTINATIONS } from './shell-nav';

export const deepestData = (route: ActivatedRoute): Record<string, unknown> => {
  let current: ActivatedRoute | null = route;

  while (current?.firstChild) {
    current = current.firstChild;
  }

  return current?.snapshot?.data ?? {};
};

@Component({
  selector: 'app-shell',
  imports: [
    CairnLogo,
    OfflineBanner,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ShellDestinationIcon,
    TranslocoPipe,
    UiAvatar,
    UiAvatarLink,
    UiNavItem,
    UiTab,
    UiTabBar,
    UiToaster,
  ],
  templateUrl: './app-shell.html',
})
export class AppShell {
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #session = inject(SessionStore);

  protected readonly destinations = SHELL_DESTINATIONS;
  protected readonly owner = this.#session.owner;

  #navigationEnd = this.#router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd));

  protected readonly url = toSignal(this.#navigationEnd.pipe(map(() => this.#router.url)), {
    initialValue: this.#router.url,
  });

  protected readonly headerKey = toSignal(this.#navigationEnd.pipe(map(() => this.#currentHeaderKey())), {
    initialValue: this.#currentHeaderKey(),
  });

  protected readonly mobileHeaderHidden = toSignal(
    this.#navigationEnd.pipe(map(() => this.#currentMobileHeaderHidden())),
    { initialValue: this.#currentMobileHeaderHidden() },
  );

  protected readonly mobileHeaderless = toSignal(this.#navigationEnd.pipe(map(() => this.#currentMobileHeaderless())), {
    initialValue: this.#currentMobileHeaderless(),
  });

  #currentHeaderKey(): string | undefined {
    return deepestData(this.#route.root)['headerKey'] as string | undefined;
  }

  #currentMobileHeaderless(): boolean {
    return deepestData(this.#route.root)['mobileHeaderless'] === true;
  }

  #currentMobileHeaderHidden(): boolean {
    return deepestData(this.#route.root)['mobileHeaderHidden'] === true;
  }

  protected isActive(path: string): boolean {
    return path === '/' ? this.url() === '/' : this.url().startsWith(path);
  }
}
