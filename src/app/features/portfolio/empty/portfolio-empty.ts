import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton } from '@joanroucoux/cairn-ui/button';
import { UiCard } from '@joanroucoux/cairn-ui/card';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePlus } from '@lucide/angular';

@Component({
  selector: 'app-portfolio-empty',
  imports: [LucidePlus, RouterLink, TranslocoPipe, UiButton, UiCard],
  templateUrl: './portfolio-empty.html',
})
export class PortfolioEmpty {}
