import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { UiAvatar } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

import { SessionStore } from '@core/session/session-store';

import { OfflineBanner } from './offline-banner';
import { SHELL_DESTINATIONS } from './shell-nav';

@Component({
  selector: 'app-shell',
  imports: [OfflineBanner, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe, UiAvatar],
  templateUrl: './app-shell.html',
})
export class AppShell {
  #session = inject(SessionStore);

  protected readonly destinations = SHELL_DESTINATIONS;
  protected readonly owner = this.#session.owner;
}
