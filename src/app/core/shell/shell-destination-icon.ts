import { Component, input } from '@angular/core';

import { LucideChartPie, LucideHouse, LucideTable } from '@lucide/angular';

import type { ShellIcon } from './shell-nav';

@Component({
  selector: 'app-shell-destination-icon',
  imports: [LucideChartPie, LucideHouse, LucideTable],
  template: `
    @switch (icon()) {
      @case ('portfolio') {
        <svg lucideHouse [size]="size()" [strokeWidth]="1.75" />
      }
      @case ('holdings') {
        <svg lucideTable [size]="size()" [strokeWidth]="1.75" />
      }
      @case ('allocation') {
        <svg lucideChartPie [size]="size()" [strokeWidth]="1.75" />
      }
      @case ('accounts') {
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          viewBox="0 0 24 24"
          [attr.height]="size()"
          [attr.width]="size()"
        >
          <line x1="3" x2="21" y1="22" y2="22" />
          <line x1="6" x2="6" y1="18" y2="11" />
          <line x1="10" x2="10" y1="18" y2="11" />
          <line x1="14" x2="14" y1="18" y2="11" />
          <line x1="18" x2="18" y1="18" y2="11" />
          <polygon points="12 2 20 7 4 7" />
        </svg>
      }
    }
  `,
})
export class ShellDestinationIcon {
  readonly icon = input.required<ShellIcon>();
  readonly size = input.required<number>();
}
