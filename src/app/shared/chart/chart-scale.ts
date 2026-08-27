import { scaleLinear } from 'd3-scale';
import { area, curveCatmullRom, line } from 'd3-shape';

export type ChartPoint = {
  t: number;
  v: number;
};

export type ChartGeometry = {
  line: string;
  area: string;
  end: { x: number; y: number };
};

export const buildGeometry = (
  points: ChartPoint[],
  width: number,
  height: number,
  padding = 4,
): ChartGeometry | null => {
  if (points.length === 0) {
    return null;
  }

  const times = points.map((point) => point.t);
  const values = points.map((point) => point.v);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const x = scaleLinear()
    .domain([Math.min(...times), Math.max(...times)])
    .range([padding, width - padding]);

  // A flat series has an empty domain, which would map every point to NaN: pin it to the middle.
  const y =
    minValue === maxValue
      ? () => height / 2
      : scaleLinear()
          .domain([minValue, maxValue])
          .range([height - padding, padding]);

  const toX = (point: ChartPoint): number => (points.length === 1 ? padding : x(point.t));

  const lineGenerator = line<ChartPoint>()
    .x(toX)
    .y((point) => y(point.v))
    .curve(curveCatmullRom.alpha(0.5));

  const areaGenerator = area<ChartPoint>()
    .x(toX)
    .y0(height)
    .y1((point) => y(point.v))
    .curve(curveCatmullRom.alpha(0.5));

  const last = points.at(-1) as ChartPoint;

  return {
    // Non-null: the generators only return null for an empty series, already handled above.
    line: lineGenerator(points) as string,
    area: areaGenerator(points) as string,
    end: { x: toX(last), y: y(last.v) },
  };
};
