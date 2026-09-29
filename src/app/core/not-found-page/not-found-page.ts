import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiButton } from '@joanroucoux/cairn-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideHouse } from '@lucide/angular';

import { CairnMark } from '@shared/branding/cairn-mark';

@Component({
  selector: 'app-not-found-page',
  imports: [CairnMark, LucideHouse, RouterLink, TranslocoPipe, UiButton],
  templateUrl: './not-found-page.html',
})
export class NotFoundPage {}
