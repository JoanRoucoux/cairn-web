import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePlus } from '@lucide/angular';

import { HOLDINGS_PATHS } from '@features/holdings/contract/holdings-paths';
import { PROFILE_PATHS } from '@features/profile/contract/profile-paths';

@Component({
  selector: 'app-portfolio-empty',
  imports: [LucidePlus, RouterLink, TranslocoPipe, UiButton, UiCard],
  templateUrl: './portfolio-empty.html',
})
export class PortfolioEmpty {
  protected readonly holdingsPaths = HOLDINGS_PATHS;
  protected readonly profilePaths = PROFILE_PATHS;
}
