import type { ChartRange } from '@shared/chart/chart-range';

export type PeriodLabel = { readonly key: string; readonly params: Record<string, string> };

export const periodLabel = (range: ChartRange, since: string | null): PeriodLabel =>
  range === 'max' && since
    ? { key: 'portfolio.curve.period.since', params: { date: since } }
    : { key: `portfolio.curve.period.${range}`, params: {} };
