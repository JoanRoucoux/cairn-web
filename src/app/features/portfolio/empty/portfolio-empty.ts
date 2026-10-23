import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePlus } from '@lucide/angular';

import { HOLDINGS_PATH } from '@features/holdings/contract/holdings-paths';
import { PROFILE_PATH } from '@features/profile/contract/profile-paths';

@Component({
  selector: 'app-portfolio-empty',
  imports: [LucidePlus, RouterLink, TranslocoPipe, UiButton, UiCard],
  templateUrl: './portfolio-empty.html',
})
export class PortfolioEmpty {
  protected readonly holdingsPath = HOLDINGS_PATH;
  protected readonly profilePath = PROFILE_PATH;
}
