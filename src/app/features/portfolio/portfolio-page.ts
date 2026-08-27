import { Component } from '@angular/core';

import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-portfolio-page',
  imports: [TranslocoPipe],
  templateUrl: './portfolio-page.html',
})
export class PortfolioPage {}
