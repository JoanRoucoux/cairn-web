import { Component, inject } from '@angular/core';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideRefreshCw } from '@lucide/angular';

import { PageLoad } from '@core/navigation/page-load';

import { CairnMark } from '@shared/branding/cairn-mark';

@Component({
  selector: 'app-navigation-error-page',
  imports: [CairnMark, LucideRefreshCw, TranslocoPipe, UiButton],
  templateUrl: './navigation-error-page.html',
})
export class NavigationErrorPage {
  readonly #pageLoad = inject(PageLoad);

  protected reload(): void {
    this.#pageLoad.reload();
  }
}
