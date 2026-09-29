import { Component, input } from '@angular/core';

@Component({
  selector: 'app-cairn-mark',
  template: `
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 16 16" [attr.height]="size()" [attr.width]="size()">
      <rect height="3" rx="1.5" width="12" x="2" y="11" />
      <rect height="3" rx="1.5" width="8" x="4" y="7" />
      <rect height="3" rx="1.5" width="4" x="6" y="3" />
    </svg>
  `,
  host: { class: 'block text-(--primary)' },
})
export class CairnMark {
  readonly size = input.required<number>();
}
