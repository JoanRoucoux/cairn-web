import {
  Component,
  DestroyRef,
  type ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { axisTicks } from './chart-axis';
import { type ChartPoint, type PlottedPoint, buildGeometry } from './chart-scale';

let instanceCount = 0;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const identityValue = (value: number): string => `${value}`;
const identityTime = (time: number): string => new Date(time).toISOString();

// Leaves room for the axis band (bottom) and the end marker/crosshair dot (top) so neither the
// curve nor the area fill ever runs under the tick labels or gets clipped at the box's own edge.
const PLOT_PADDING = { x: 4, top: 10, bottom: 20 };

type PlotRef = ElementRef<SVGSVGElement>;

/**
 * Portfolio or instrument value over time. The gradient identifiers are per-instance: two charts
 * on one page would otherwise share a <defs> id and the second would silently take the first's fill.
 */
@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.html',
})
export class LineChart {
  readonly points = input.required<ChartPoint[]>();
  readonly label = input.required<string>();
  readonly width = input(1080);
  readonly height = input(196);
  /** `sparkline` drops the grid, the end marker, the axis and the crosshair, for a compact figure inside a stat. */
  readonly variant = input<'default' | 'sparkline'>('default');
  readonly valueFormat = input<(value: number) => string>(identityValue);
  readonly timeFormat = input<(time: number) => string>(identityTime);
  readonly axisFormat = input<(time: number) => string>(identityTime);
  readonly timeColumnLabel = input('Time');
  readonly valueColumnLabel = input('Value');

  #destroyRef = inject(DestroyRef);

  protected readonly areaId = `chart-area-${++instanceCount}`;
  protected readonly lineId = `chart-line-${instanceCount}`;

  protected readonly svgRef = viewChild.required<PlotRef>('svgRef');
  protected readonly activeIndex = signal<number | null>(null);

  // Drawn in the container's actual pixel size instead of a fixed viewBox stretched by CSS: a
  // mismatched aspect ratio would otherwise distort every stroke, circle and glyph in the SVG.
  protected readonly measuredSize = signal<{ width: number; height: number } | null>(null);

  protected readonly interactive = computed(() => this.variant() === 'default');

  protected readonly effectiveWidth = computed(() => this.measuredSize()?.width ?? this.width());
  protected readonly effectiveHeight = computed(() => this.measuredSize()?.height ?? this.height());

  protected readonly geometry = computed(() =>
    buildGeometry(
      this.points(),
      this.effectiveWidth(),
      this.effectiveHeight(),
      this.interactive() ? PLOT_PADDING : undefined,
    ),
  );

  protected readonly ticks = computed(() => {
    const geometry = this.geometry();

    return this.interactive() && geometry ? axisTicks(geometry.points) : [];
  });

  protected readonly active = computed<PlottedPoint | null>(() => {
    const geometry = this.geometry();
    const index = this.activeIndex();

    // Non-null: every setter of activeIndex clamps it to the geometry's own point count.
    return geometry && index !== null ? (geometry.points[index] as PlottedPoint) : null;
  });

  #renderRef = afterNextRender(() => this.#observeSize());

  #observeSize(): void {
    this.#destroyRef.onDestroy(() => this.#renderRef.destroy());

    if (!this.interactive() || typeof ResizeObserver === 'undefined') {
      return;
    }

    const element = this.svgRef().nativeElement;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        const { width, height } = entry.contentRect;

        this.measuredSize.set({ width, height });
      }
    });

    observer.observe(element);
    this.#destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Keeps only the first, middle and last ticks below `sm`, so 5 labels never collide on a narrow card. */
  protected coreTick(index: number, count: number): boolean {
    if (count <= 3) {
      return true;
    }

    const middle = Math.floor((count - 1) / 2);

    return index === 0 || index === count - 1 || index === middle;
  }

  protected tooltipStyle(point: PlottedPoint): string {
    return `left: ${(point.x / this.effectiveWidth()) * 100}%; top: ${(point.y / this.effectiveHeight()) * 100}%`;
  }

  protected onPointerMove(event: PointerEvent): void {
    const geometry = this.geometry();

    if (!this.interactive() || !geometry || geometry.points.length === 0) {
      return;
    }

    const rect = this.svgRef().nativeElement.getBoundingClientRect();
    const ratio = rect.width === 0 ? 1 : this.effectiveWidth() / rect.width;
    const x = (event.clientX - rect.left) * ratio;

    let nearest = 0;
    let nearestDistance = Infinity;

    geometry.points.forEach((point, index) => {
      const distance = Math.abs(point.x - x);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });

    this.activeIndex.set(nearest);
  }

  protected onPointerLeave(): void {
    this.activeIndex.set(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const geometry = this.geometry();

    if (!this.interactive() || !geometry || geometry.points.length === 0) {
      return;
    }

    const last = geometry.points.length - 1;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this.activeIndex.set(clamp((this.activeIndex() ?? -1) + 1, 0, last));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.activeIndex.set(clamp((this.activeIndex() ?? last + 1) - 1, 0, last));
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(last);
        break;
      case 'Escape':
        this.activeIndex.set(null);
        break;
    }
  }

  protected readonly gridlines = computed(() => {
    const geometry = this.geometry();
    const top = geometry?.plotTop ?? 0;
    const bottom = geometry?.plotBottom ?? this.effectiveHeight();

    return [0.25, 0.5, 0.75].map((fraction) => Math.round(top + (bottom - top) * fraction));
  });
}
