export const deltaTone = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return 'text-(--subtle-foreground)';
  }

  if (value > 0) {
    return 'text-(--positive)';
  }

  return value < 0 ? 'text-(--negative)' : 'text-(--muted-foreground)';
};

export const isMissing = (value: number | null | undefined): boolean => value === null || value === undefined;
