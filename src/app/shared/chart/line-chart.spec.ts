import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type RenderResult, fireEvent, render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { type ChartPoint } from './chart-scale';
import { LineChart } from './line-chart';

const points: ChartPoint[] = [
  { t: 0, v: 100 },
  { t: 1, v: 130 },
  { t: 2, v: 160 },
];

const renderChart = (
  series: ChartPoint[],
  variant: 'default' | 'sparkline' = 'default',
): Promise<RenderResult<LineChart>> =>
  render(LineChart, {
    inputs: {
      points: series,
      label: 'Portfolio value over one month',
      variant,
      valueFormat: (value: number) => `€${value}`,
      timeFormat: (time: number) => `t${time}`,
    },
    providers: [provideZonelessChangeDetection()],
  });

describe('LineChart', () => {
  it('should name the chart for assistive technology', async () => {
    await renderChart(points);

    expect(screen.getByRole('img', { name: 'Portfolio value over one month' })).toBeInTheDocument();
  });

  it('should draw the series', async () => {
    const { container } = await renderChart(points);

    expect(container.querySelector('[data-testid="chart-line"]')).toHaveAttribute('d', expect.stringMatching(/^M/));
  });

  it('should mark the last point', async () => {
    const { container } = await renderChart(points);

    expect(container.querySelector('[data-testid="chart-end"]')).toBeInTheDocument();
  });

  it('should render nothing to draw when the series is empty', async () => {
    const { container } = await renderChart([]);

    expect(container.querySelector('[data-testid="chart-line"]')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Portfolio value over one month' })).toBeInTheDocument();
  });

  it('should ignore a key press on an empty series', async () => {
    const { container } = await renderChart([]);
    const svg = container.querySelector('svg') as Element;

    fireEvent.keyDown(svg, { key: 'ArrowRight' });

    expect(screen.queryByTestId('chart-tooltip')).not.toBeInTheDocument();
  });

  it('should ignore a pointer move over an empty series', async () => {
    const { container } = await renderChart([]);
    const svg = container.querySelector('svg') as Element;

    fireEvent.pointerMove(svg, { clientX: 0, clientY: 0 });

    expect(screen.queryByTestId('chart-tooltip')).not.toBeInTheDocument();
  });

  it('should drop the grid and the end marker in the sparkline variant', async () => {
    const { container } = await renderChart(points, 'sparkline');

    expect(container.querySelector('line')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="chart-end"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="chart-line"]')).toBeInTheDocument();
  });

  it('should be decorative in the sparkline variant, since the surrounding figure already carries the name', async () => {
    const { container } = await renderChart(points, 'sparkline');

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should show a crosshair and a tooltip on pointer move over the plot area, default variant only', async () => {
    const { container } = await renderChart(points);
    const svg = container.querySelector('svg') as Element;

    fireEvent.pointerMove(svg, { clientX: 0, clientY: 0 });

    expect(container.querySelector('[data-testid="chart-crosshair"]')).toBeInTheDocument();
    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('€100');
    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('t0');
  });

  it('should never show a crosshair on the sparkline variant', async () => {
    const { container } = await renderChart(points, 'sparkline');
    const svg = container.querySelector('svg') as Element;

    fireEvent.pointerMove(svg, { clientX: 0, clientY: 0 });

    expect(container.querySelector('[data-testid="chart-crosshair"]')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chart-tooltip')).not.toBeInTheDocument();
  });

  it('should hide the tooltip on pointer leave', async () => {
    const { container } = await renderChart(points);
    const svg = container.querySelector('svg') as Element;

    fireEvent.pointerMove(svg, { clientX: 0, clientY: 0 });
    fireEvent.pointerLeave(svg);

    expect(screen.queryByTestId('chart-tooltip')).not.toBeInTheDocument();
  });

  it('should move the active point with the arrow keys once the chart has focus', async () => {
    const user = userEvent.setup();
    await renderChart(points);

    const chart = screen.getByRole('img', { name: 'Portfolio value over one month' });
    chart.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('€100');

    await user.keyboard('{ArrowRight}');

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('€130');

    await user.keyboard('{End}');

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('€160');

    await user.keyboard('{Home}');

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('€100');

    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('chart-tooltip')).not.toBeInTheDocument();
  });

  it('should move left from the current point with ArrowLeft', async () => {
    const user = userEvent.setup();
    await renderChart(points);

    const chart = screen.getByRole('img', { name: 'Portfolio value over one month' });
    chart.focus();
    await user.keyboard('{End}');
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('€130');
  });

  it('should start ArrowLeft from the last point when nothing is active yet', async () => {
    const user = userEvent.setup();
    await renderChart(points);

    const chart = screen.getByRole('img', { name: 'Portfolio value over one month' });
    chart.focus();
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('€160');
  });

  it('should format the value and the time as-is when no formatter is given', async () => {
    const { container } = await render(LineChart, {
      inputs: { points, label: 'Portfolio value over one month' },
      providers: [provideZonelessChangeDetection()],
    });
    const svg = container.querySelector('svg') as Element;

    fireEvent.pointerMove(svg, { clientX: 0, clientY: 0 });

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('100');
  });

  it('should scale the pointer position by the plot area actual rendered width', async () => {
    const { container } = await renderChart(points);
    const svg = container.querySelector('svg') as SVGSVGElement;
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 1080 } as DOMRect);

    fireEvent.pointerMove(svg, { clientX: 1080, clientY: 0 });

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('€160');
  });

  it('should offer a table alternative to the curve for the default variant', async () => {
    await renderChart(points);

    const table = screen.getByRole('table', { name: 'Portfolio value over one month' });

    expect(table).toHaveClass('sr-only');
    expect(screen.getAllByRole('row')).toHaveLength(points.length + 1);
  });

  it('should offer no table alternative for the sparkline variant', async () => {
    await renderChart(points, 'sparkline');

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('should anchor the edge axis labels at the start and the end, so they are never clipped', async () => {
    const longSeries: ChartPoint[] = Array.from({ length: 18 }, (_, index) => ({ t: index, v: 100 + index }));
    const { container } = await renderChart(longSeries);

    const ticks = container.querySelectorAll('[data-testid="chart-axis-tick"]');

    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toHaveAttribute('text-anchor', 'start');
    expect(ticks[1]).toHaveAttribute('text-anchor', 'middle');
    expect(ticks[ticks.length - 1]).toHaveAttribute('text-anchor', 'end');
  });

  it('should keep only the first, middle and last axis label visible below the sm breakpoint', async () => {
    const longSeries: ChartPoint[] = Array.from({ length: 18 }, (_, index) => ({ t: index, v: 100 + index }));
    const { container } = await renderChart(longSeries);

    const ticks = container.querySelectorAll('[data-testid="chart-axis-tick"]');
    const hiddenOnMobile = [...ticks].map((tick) => tick.classList.contains('max-sm:hidden'));

    expect(hiddenOnMobile).toEqual([false, true, false, true, false]);
  });

  it('should keep every axis label visible when there are 3 or fewer', async () => {
    const { container } = await renderChart(points);

    const ticks = container.querySelectorAll('[data-testid="chart-axis-tick"]');

    expect([...ticks].every((tick) => !tick.classList.contains('max-sm:hidden'))).toBe(true);
  });

  describe('with a ResizeObserver available', () => {
    let observe: ReturnType<typeof vi.fn>;
    let disconnect: ReturnType<typeof vi.fn>;
    let triggerResize: (size: { width: number; height: number }) => void;
    let triggerEmptyResize: () => void;
    let originalResizeObserver: typeof ResizeObserver | undefined;

    beforeEach(() => {
      observe = vi.fn();
      disconnect = vi.fn();
      originalResizeObserver = globalThis.ResizeObserver;

      class FakeResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          triggerResize = (size) =>
            callback([{ contentRect: size } as ResizeObserverEntry], this as unknown as ResizeObserver);
          // A real ResizeObserver can call back with an empty entries array (e.g. once the
          // observed element stops being rendered), which is why the callback destructures
          // `[entry]` rather than assuming index 0 exists.
          triggerEmptyResize = () => callback([], this as unknown as ResizeObserver);
        }

        observe = observe;
        disconnect = disconnect;
        unobserve = vi.fn();
      }

      globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      globalThis.ResizeObserver = originalResizeObserver as typeof ResizeObserver;
    });

    it('should draw at the container measured pixel size instead of the default viewBox', async () => {
      const { container, fixture } = await renderChart(points);
      fixture.detectChanges();

      expect(observe).toHaveBeenCalled();

      triggerResize({ width: 320, height: 192 });
      fixture.detectChanges();

      expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 320 192');
    });

    it('should never measure the sparkline variant, which keeps its own fixed size', async () => {
      const { container, fixture } = await renderChart(points, 'sparkline');
      fixture.detectChanges();

      expect(observe).not.toHaveBeenCalled();
      expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 1080 196');
    });

    it('should ignore a resize callback with no entry', async () => {
      const { container, fixture } = await renderChart(points);
      fixture.detectChanges();

      triggerEmptyResize();
      fixture.detectChanges();

      expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 1080 196');
    });

    it('should disconnect the observer when the chart is destroyed', async () => {
      const { fixture } = await renderChart(points);
      fixture.detectChanges();

      fixture.destroy();

      expect(disconnect).toHaveBeenCalled();
    });
  });

  it('should give each instance its own gradient identifiers', async () => {
    const first = await renderChart(points);
    TestBed.resetTestingModule();
    const second = await renderChart(points);

    const idOf = (result: { container: Element }): string | null | undefined =>
      result.container.querySelector('linearGradient')?.getAttribute('id');

    expect(idOf(first)).not.toBe(idOf(second));
  });
});
