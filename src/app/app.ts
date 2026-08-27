import { Component, inject } from '@angular/core';

import { AppTitleStrategy } from '@core/i18n/title-strategy';
import { AppShell } from '@core/shell/app-shell';

@Component({
  selector: 'app-root',
  imports: [AppShell],
  templateUrl: './app.html',
})
export class App {
  #titleStrategy = inject(AppTitleStrategy);

  protected readonly pageTitle = this.#titleStrategy.pageTitle;
}
