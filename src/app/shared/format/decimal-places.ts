const MAX_DECIMAL_PLACES = 6;

export function decimalPlaces(value: number): number {
  const fraction = Math.abs(value).toString().split('.')[1];

  return fraction ? Math.min(fraction.length, MAX_DECIMAL_PLACES) : 0;
}
