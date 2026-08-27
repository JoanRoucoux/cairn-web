import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type RenderResult, render, screen } from '@testing-library/angular';

import { type ChartPoint } from './chart-scale';
import { LineChart } from './line-chart';

const points: ChartPoint[] = [
  { t: 0, v: 100 },
  { t: 1, v: 160 },
];

const renderChart = (series: ChartPoint[]): Promise<RenderResult<LineChart>> =>
  render(LineChart, {
    inputs: { points: series, label: 'Portfolio value over one month' },
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

  it('should give each instance its own gradient identifiers', async () => {
    const first = await renderChart(points);
    TestBed.resetTestingModule();
    const second = await renderChart(points);

    const idOf = (result: { container: Element }): string | null | undefined =>
      result.container.querySelector('linearGradient')?.getAttribute('id');

    expect(idOf(first)).not.toBe(idOf(second));
  });
});
