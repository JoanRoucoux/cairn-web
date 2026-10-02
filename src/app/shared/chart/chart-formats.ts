import { formatAmount } from '@joanroucoux/cairn-ui';

import type { ChartRange } from './chart-range';

export type ChartFormats = {
  value: (value: number) => string;
  delta: (delta: number) => string;
  time: (time: number) => string;
  axis: (time: number) => string;
};

const MAX_TICKS = 5;

const tickTimes = (times: readonly number[]): number[] => {
  if (times.length <= MAX_TICKS) {
    return [...times];
  }
  const step = (times.length - 1) / (MAX_TICKS - 1);
  const indexes = new Set(Array.from({ length: MAX_TICKS }, (_, tick) => Math.round(tick * step)));
  return [...indexes].sort((a, b) => a - b).map((index) => times[index] as number);
};

export const chartFormats = (
  locale: string,
  masked: boolean,
  range: ChartRange,
  times: readonly number[] = [],
): ChartFormats => {
  const timeFormat =
    range === '1d'
      ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
      : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });

  const zone = 'Europe/Paris';
  const axisOptions: Record<ChartRange, Intl.DateTimeFormatOptions> = {
    '1d': { hour: '2-digit', minute: '2-digit', timeZone: zone },
    '7d': { weekday: 'short', day: 'numeric', timeZone: zone },
    '1m': { day: 'numeric', month: 'short', timeZone: zone },
    '1y': { month: 'short', timeZone: zone },
    '5y': { year: 'numeric', timeZone: zone },
    max: { year: 'numeric', timeZone: zone },
  };
  const axisFormat = new Intl.DateTimeFormat(locale, axisOptions[range]);

  const axisLabels = new Map<number, string>();
  let previous: string | undefined;
  for (const tick of tickTimes(times)) {
    const label = axisFormat.format(tick);
    axisLabels.set(tick, label === previous ? '' : label);
    previous = label;
  }

  return {
    value: (value) => formatAmount(value, { locale, currency: 'EUR' }, masked),
    delta: (delta) => formatAmount(delta, { locale, currency: 'EUR', signed: true, fractionDigits: 2 }, masked),
    time: (time) => timeFormat.format(time),
    axis: (time) => axisLabels.get(time) ?? axisFormat.format(time),
  };
};
