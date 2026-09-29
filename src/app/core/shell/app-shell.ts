import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

import { UiAvatar, UiNavItem, UiTab, UiTabBar } from '@joanroucoux/cairn-ui';
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
    RouterOutlet,
    ShellDestinationIcon,
    TranslocoPipe,
    UiAvatar,
    UiNavItem,
    UiTab,
    UiTabBar,
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

  #currentHeaderKey(): string | undefined {
    return deepestData(this.#route.root)['headerKey'] as string | undefined;
  }

  protected isActive(path: string): boolean {
    return path === '/' ? this.url() === '/' : this.url().startsWith(path);
  }
}
