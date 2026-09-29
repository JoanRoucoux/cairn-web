import { Component } from '@angular/core';

@Component({
  selector: 'app-cairn-logo',
  template: `
    <svg aria-hidden="true" class="size-5 text-(--primary)" fill="currentColor" viewBox="0 0 16 16">
      <rect height="3" rx="1.5" width="12" x="2" y="11" />
      <rect height="3" rx="1.5" width="8" x="4" y="7" />
      <rect height="3" rx="1.5" width="4" x="6" y="3" />
    </svg>
    <span class="text-body font-bold">Cairn</span>
  `,
  host: { class: 'inline-flex items-center gap-2' },
})
export class CairnLogo {}
