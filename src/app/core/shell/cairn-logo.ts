import { Component } from '@angular/core';

import { CairnMark } from '@shared/branding/cairn-mark';

@Component({
  selector: 'app-cairn-logo',
  imports: [CairnMark],
  template: `
    <app-cairn-mark [size]="22" />
    <span class="text-[20px] leading-none font-bold tracking-[-0.01em]">Cairn</span>
  `,
  host: { class: 'inline-flex items-center gap-2' },
})
export class CairnLogo {}
