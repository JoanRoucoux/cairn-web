import { Component, computed, input } from '@angular/core';

import { type ChartPoint, buildGeometry } from './chart-scale';

let instanceCount = 0;

/**
 * Portfolio or instrument value over time. The gradient identifiers are per-instance: two charts
 * on one page would otherwise share a <defs> id and the second would silently take the first's fill.
 */
@Component({
  selector: 'app-line-chart',
  template: `
    <svg
      class="block w-full"
      role="img"
      [attr.aria-label]="label()"
      [attr.height]="height()"
      [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
      [attr.width]="width()"
    >
      <defs>
        <linearGradient x1="0" x2="0" y1="0" y2="1" [attr.id]="areaId">
          <stop offset="0%" style="stop-color: var(--primary); stop-opacity: 0.17" />
          <stop offset="100%" style="stop-color: var(--primary); stop-opacity: 0" />
        </linearGradient>
        <linearGradient x1="0" x2="1" y1="0" y2="0" [attr.id]="lineId">
          <stop offset="0%" style="stop-color: var(--primary-to)" />
          <stop offset="100%" style="stop-color: var(--primary)" />
        </linearGradient>
      </defs>

      @for (gridline of gridlines(); track gridline) {
        <line style="stroke: var(--hairline)" x1="0" [attr.x2]="width()" [attr.y1]="gridline" [attr.y2]="gridline" />
      }

      @if (geometry(); as geometry) {
        <path [attr.d]="geometry.area" [attr.fill]="'url(#' + areaId + ')'" />
        <path
          data-testid="chart-line"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2.2"
          [attr.d]="geometry.line"
          [attr.stroke]="'url(#' + lineId + ')'"
        />
        <circle
          data-testid="chart-end"
          r="5"
          stroke-width="3"
          style="fill: var(--primary); stroke: var(--card)"
          [attr.cx]="geometry.end.x"
          [attr.cy]="geometry.end.y"
        />
      }
    </svg>
  `,
})
export class LineChart {
  readonly points = input.required<ChartPoint[]>();
  readonly label = input.required<string>();
  readonly width = input(1080);
  readonly height = input(196);

  protected readonly areaId = `chart-area-${++instanceCount}`;
  protected readonly lineId = `chart-line-${instanceCount}`;

  protected readonly geometry = computed(() => buildGeometry(this.points(), this.width(), this.height()));

  protected readonly gridlines = computed(() => {
    const height = this.height();

    return [0.25, 0.5, 0.75].map((fraction) => Math.round(height * fraction));
  });
}
