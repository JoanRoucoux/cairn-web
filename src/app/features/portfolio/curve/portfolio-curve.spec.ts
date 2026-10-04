import { LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';

import { type AsyncState } from '@joanroucoux/cairn-ui/async';
import { type ChartPoint, UiLineChart } from '@joanroucoux/cairn-ui/line-chart';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { chartFormats } from '@shared/chart/chart-formats';
import type { ChartRange } from '@shared/chart/chart-range';
import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioCurve } from './portfolio-curve';

const points: ChartPoint[] = [
  { t: Date.UTC(2026, 7, 25), v: 161389.51 },
  { t: Date.UTC(2026, 8, 25), v: 152318.64 },
];

const renderCurve = (
  overrides: Partial<{
    state: AsyncState;
    blocking: boolean;
    chartReloading: boolean;
    shownRange: ChartRange;
    points: ChartPoint[];
    range: ChartRange;
    rangeChangeEur: number | undefined;
    rangeChangeRatio: number | null | undefined;
    reconstructed: boolean;
    since: string | null;
  }> = {},
): ReturnType<typeof render> =>
  render(PortfolioCurve, {
    imports: [getTranslocoTestingModule()],
    inputs: {
      state: 'ready',
      points,
      range: '1m',
      rangeChangeEur: 2904.77,
      rangeChangeRatio: 0.018,
      reconstructed: false,
      formats: chartFormats('en-GB', false, '1m'),
      startLabel: 'Start',
      ...overrides,
    },
    providers: [provideZonelessChangeDetection(), { provide: LOCALE_ID, useValue: 'en-GB' }],
  });

describe('PortfolioCurve', () => {
  it('should key the chart on the shown range, and on the picked one until a series is shown', async () => {
    const { fixture } = await renderCurve({ shownRange: '1y' });
    const key = (): string | null =>
      (fixture.debugElement.query(By.directive(UiLineChart)).componentInstance as UiLineChart).rangeKey();

    expect(key()).toBe('1y');

    fixture.componentRef.setInput('shownRange', undefined);
    await fixture.whenStable();

    expect(key()).toBe('1m');
  });

  it('should show the range change, its ratio at two decimals, and the period label', async () => {
    await renderCurve();

    expect(await screen.findByText('+€2,904.77', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('+1.80%', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('portfolio.curve.period.1m')).toBeInTheDocument();
  });

  it('should show a dash for the range change while performance is not ready', async () => {
    await renderCurve({ rangeChangeEur: undefined });

    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('should show the range change line for the one-day range too', async () => {
    await renderCurve({ range: '1d' });

    expect(await screen.findByText('portfolio.curve.period.1d')).toBeInTheDocument();
  });

  it('should show the range change line for every range beyond one day', async () => {
    await renderCurve({ range: '7d' });

    expect(await screen.findByText('portfolio.curve.period.7d')).toBeInTheDocument();
  });

  it('should replace the whole block with a skeleton on a blocking load, segmented control included', async () => {
    await renderCurve({ state: 'loading', blocking: true });

    expect(await screen.findByTestId('curve-loading')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByTestId('curve-range-loading')).not.toBeInTheDocument();
  });

  it('should show only the error card on a blocking error, with a working retry', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderCurve({ state: 'error', blocking: true });
    const retried = vi.fn();
    fixture.componentInstance.retry.subscribe(retried);

    expect(await screen.findByRole('alert')).toHaveTextContent('portfolio.curve.error');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'portfolio.error.retry' }));

    expect(retried).toHaveBeenCalledOnce();
  });

  it('should keep the segmented control while a range change reloads data already shown', async () => {
    await renderCurve({ state: 'loading', blocking: false });

    expect(await screen.findAllByRole('radio')).toHaveLength(6);
    expect(await screen.findByTestId('curve-range-loading')).toBeInTheDocument();
  });

  it('should replace the range change line with a skeleton while loading, and drop it on error', async () => {
    const { fixture } = await renderCurve({ state: 'loading' });

    expect(screen.queryByTestId('curve-range-loading')).not.toBeInTheDocument();
    expect(await screen.findByTestId('curve-range-loading')).toBeInTheDocument();
    expect(screen.queryByText('portfolio.curve.period.1m')).not.toBeInTheDocument();

    fixture.componentRef.setInput('state', 'error');
    fixture.detectChanges();

    await vi.waitFor(() => expect(screen.queryByTestId('curve-range-loading')).not.toBeInTheDocument());
    expect(screen.queryByText('portfolio.curve.period.1m')).not.toBeInTheDocument();
  });

  it('should name the date of the first point on the Max range', async () => {
    await renderCurve({ range: 'max', since: 'March 2019' });

    expect(await screen.findByText('portfolio.curve.period.since')).toBeInTheDocument();
  });

  it('should follow each change in the tooltip with the start of the range', async () => {
    const { fixture } = await renderCurve();
    const chart = fixture.debugElement.query(By.directive(UiLineChart)).componentInstance as UiLineChart;

    expect(chart.deltaSuffix()).toBe('portfolio.curve.sinceStart');
  });

  it('should offer the six ranges', async () => {
    await renderCurve();

    expect(await screen.findAllByRole('radio')).toHaveLength(6);
  });

  it('should render the chart with its startLabel', async () => {
    await renderCurve();

    expect(await screen.findByRole('img')).toBeInTheDocument();
  });

  it('should fall back to a plain label when there is no point yet', async () => {
    await renderCurve({ points: [] });

    expect(await screen.findByRole('img', { name: 'portfolio.curve.label' })).toBeInTheDocument();
  });

  it('should not show the reconstructed note by default', async () => {
    await renderCurve({ reconstructed: false });

    expect(screen.queryByTestId('reconstructed-note')).not.toBeInTheDocument();
  });

  it('should show the reconstructed note when the series is reconstructed', async () => {
    await renderCurve({ reconstructed: true });

    expect(await screen.findByTestId('reconstructed-note')).toBeInTheDocument();
  });

  it('should keep the chart mounted while a range reloads over a series already shown', async () => {
    const { container } = await renderCurve({ state: 'loading', chartReloading: true });

    expect(container.querySelector('ui-line-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('curve-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('curve-range-loading')).not.toBeInTheDocument();
    expect(await screen.findByText('portfolio.curve.period.1m')).toBeInTheDocument();
    expect(screen.queryByTestId('curve-range-loading')).not.toBeInTheDocument();
  });

  it('should label the variation with the range of the series shown, not the one picked', async () => {
    await renderCurve({ state: 'loading', chartReloading: true, range: '1y', shownRange: '1m' });

    expect(await screen.findByText('portfolio.curve.period.1m')).toBeInTheDocument();
    expect(screen.queryByText('portfolio.curve.period.1y')).not.toBeInTheDocument();
  });

  it('should show a skeleton while loading', async () => {
    await renderCurve({ state: 'loading' });

    expect(await screen.findByTestId('curve-loading')).toBeInTheDocument();
  });

  it('should show an error with a working retry', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderCurve({ state: 'error' });
    const retried = vi.fn();
    fixture.componentInstance.retry.subscribe(retried);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'portfolio.error.retry' }));

    expect(retried).toHaveBeenCalledOnce();
  });

  it('should emit a range change when a different option is picked', async () => {
    const user = userEvent.setup();
    const { fixture } = await renderCurve();
    const changed = vi.fn();
    fixture.componentInstance.rangeChange.subscribe(changed);

    await user.click(await screen.findByRole('radio', { name: 'chart.range.7d' }));

    expect(changed).toHaveBeenCalledWith('7d');
  });
});
