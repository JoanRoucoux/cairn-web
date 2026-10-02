import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton, UiCard } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePlus } from '@lucide/angular';

@Component({
  selector: 'app-portfolio-empty',
  imports: [LucidePlus, RouterLink, TranslocoPipe, UiButton, UiCard],
  templateUrl: './portfolio-empty.html',
})
export class PortfolioEmpty {}
