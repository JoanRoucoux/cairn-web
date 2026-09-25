import { scaleLinear } from 'd3-scale';
import { area, curveCatmullRom, line } from 'd3-shape';

export type ChartPoint = {
  t: number;
  v: number;
};

export type PlottedPoint = ChartPoint & { x: number; y: number };

export type ChartGeometry = {
  line: string;
  area: string;
  end: { x: number; y: number };
  points: PlottedPoint[];
  /** Bottom of the plotted curve/area, above any reserved axis band. */
  plotBottom: number;
  /** Top of the plotted curve/area, below any reserved top margin. */
  plotTop: number;
};

export type GeometryPadding = { x?: number; top?: number; bottom?: number };

export const buildGeometry = (
  points: ChartPoint[],
  width: number,
  height: number,
  padding: GeometryPadding = {},
): ChartGeometry | null => {
  if (points.length === 0) {
    return null;
  }

  const { x: paddingX = 4, top: paddingTop = 4, bottom: paddingBottom = 4 } = padding;
  const plotTop = paddingTop;
  const plotBottom = height - paddingBottom;

  const times = points.map((point) => point.t);
  const values = points.map((point) => point.v);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const x = scaleLinear()
    .domain([Math.min(...times), Math.max(...times)])
    .range([paddingX, width - paddingX]);

  // A flat series has an empty domain, which would map every point to NaN: pin it to the middle.
  const y =
    minValue === maxValue
      ? () => (plotTop + plotBottom) / 2
      : scaleLinear().domain([minValue, maxValue]).range([plotBottom, plotTop]);

  const toX = (point: ChartPoint): number => (points.length === 1 ? paddingX : x(point.t));

  const lineGenerator = line<ChartPoint>()
    .x(toX)
    .y((point) => y(point.v))
    .curve(curveCatmullRom.alpha(0.5));

  const areaGenerator = area<ChartPoint>()
    .x(toX)
    .y0(plotBottom)
    .y1((point) => y(point.v))
    .curve(curveCatmullRom.alpha(0.5));

  const last = points.at(-1) as ChartPoint;

  return {
    // Non-null: the generators only return null for an empty series, already handled above.
    line: lineGenerator(points) as string,
    area: areaGenerator(points) as string,
    end: { x: toX(last), y: y(last.v) },
    points: points.map((point) => ({ ...point, x: toX(point), y: y(point.v) })),
    plotBottom,
    plotTop,
  };
};
