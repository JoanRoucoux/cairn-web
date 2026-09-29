import { Component, input } from '@angular/core';

import { LucideChartPie, LucideHouse, LucideLandmark, LucideTable } from '@lucide/angular';

import type { ShellIcon } from './shell-nav';

@Component({
  selector: 'app-shell-destination-icon',
  imports: [LucideChartPie, LucideHouse, LucideLandmark, LucideTable],
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
        <svg lucideLandmark [size]="size()" [strokeWidth]="1.75" />
      }
    }
  `,
})
export class ShellDestinationIcon {
  readonly icon = input.required<ShellIcon>();
  readonly size = input.required<number>();
}
