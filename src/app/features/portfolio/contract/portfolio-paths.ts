const SEGMENT = '';
const ALLOCATION_SEGMENT = 'allocation';

export const PORTFOLIO_PATHS = {
  segment: SEGMENT,
  allocationSegment: ALLOCATION_SEGMENT,
  home: `/${SEGMENT}`,
  allocation: `/${ALLOCATION_SEGMENT}`,
} as const;
