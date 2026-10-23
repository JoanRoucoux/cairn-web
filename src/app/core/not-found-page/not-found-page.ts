import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideHouse } from '@lucide/angular';

import { PORTFOLIO_PATH } from '@features/portfolio/contract/portfolio-paths';

import { CairnMark } from '@shared/branding/cairn-mark';

@Component({
  selector: 'app-not-found-page',
  imports: [CairnMark, LucideHouse, RouterLink, TranslocoPipe, UiButton],
  templateUrl: './not-found-page.html',
})
export class NotFoundPage {
  protected readonly portfolioPath = PORTFOLIO_PATH;
}
