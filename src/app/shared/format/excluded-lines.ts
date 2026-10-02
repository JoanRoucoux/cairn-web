import { pluralKey } from './plural-key';

export type ExcludableLine = { marketValueEur?: number | null; priceCurrency?: string | null };

export type ExcludedCounts = { unvaluedCount: number; nonEurCount: number };

export const isExcluded = (line: ExcludableLine): boolean =>
  line.marketValueEur === null || line.marketValueEur === undefined;

export const isNonEur = (line: ExcludableLine): boolean =>
  isExcluded(line) && Boolean(line.priceCurrency) && line.priceCurrency !== 'EUR';

export const excludedCounts = (lines: readonly ExcludableLine[]): ExcludedCounts => {
  const excluded = lines.filter(isExcluded);
  const nonEurCount = excluded.filter(isNonEur).length;

  return { unvaluedCount: excluded.length - nonEurCount, nonEurCount };
};

export const excludedTotal = ({
  unvaluedCount,
  nonEurCount,
}: ExcludedCounts): { key: string; count: number } | undefined => {
  if (nonEurCount > 0) {
    const count = unvaluedCount + nonEurCount;

    return { key: pluralKey('excluded.lines', count), count };
  }

  return unvaluedCount > 0 ? { key: pluralKey('excluded.noQuote', unvaluedCount), count: unvaluedCount } : undefined;
};
