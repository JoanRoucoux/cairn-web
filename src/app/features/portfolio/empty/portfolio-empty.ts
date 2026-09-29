import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton, UiCard } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-portfolio-empty',
  imports: [RouterLink, TranslocoPipe, UiButton, UiCard],
  templateUrl: './portfolio-empty.html',
})
export class PortfolioEmpty {}
