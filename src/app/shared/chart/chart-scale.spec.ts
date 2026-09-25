import { type ChartPoint, buildGeometry } from './chart-scale';

const series: ChartPoint[] = [
  { t: 0, v: 100 },
  { t: 1, v: 120 },
  { t: 2, v: 110 },
  { t: 3, v: 160 },
];

describe('buildGeometry', () => {
  it('should return null for an empty series, so the caller can render an empty state', () => {
    expect(buildGeometry([], 100, 50)).toBeNull();
  });

  it('should produce a path that starts with a move command', () => {
    expect(buildGeometry(series, 100, 50)?.line).toMatch(/^M/);
  });

  it('should close the area path so it can be filled', () => {
    expect(buildGeometry(series, 100, 50)?.area).toMatch(/Z$/);
  });

  it('should place the highest value at the top of the box, inside the padding', () => {
    const geometry = buildGeometry(series, 100, 50, { x: 4, top: 4, bottom: 4 });

    expect(geometry?.end).toEqual({ x: 96, y: 4 });
  });

  it('should keep a flat series on the vertical centre rather than dividing by zero', () => {
    const flat: ChartPoint[] = [
      { t: 0, v: 42 },
      { t: 1, v: 42 },
    ];

    expect(buildGeometry(flat, 100, 50, { x: 4, top: 4, bottom: 4 })?.end.y).toBe(25);
  });

  it('should handle a single point', () => {
    const geometry = buildGeometry([{ t: 0, v: 42 }], 100, 50, { x: 4, top: 4, bottom: 4 });

    expect(geometry?.end).toEqual({ x: 4, y: 25 });
  });

  it('should default to a uniform 4px padding on every side', () => {
    const geometry = buildGeometry(series, 100, 50);

    expect(geometry?.end).toEqual({ x: 96, y: 4 });
  });

  it('should reserve a bottom band and a top margin separately, above/below where the curve is drawn', () => {
    const geometry = buildGeometry(series, 100, 100, { x: 4, top: 10, bottom: 30 });

    expect(geometry?.plotTop).toBe(10);
    expect(geometry?.plotBottom).toBe(70);
    // The highest value (last point) sits at plotTop, not at the box's own top edge (0).
    expect(geometry?.end.y).toBe(10);
  });
});
