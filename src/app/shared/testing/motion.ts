import { vi } from 'vitest';

export type MotionRecord = {
  highlighted: Element[];
  restore: () => void;
};

export const recordMotion = (): MotionRecord => {
  const record: MotionRecord = {
    highlighted: [],
    restore: () => Reflect.deleteProperty(Element.prototype, 'animate'),
  };

  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: vi.fn(function (this: Element) {
      record.highlighted.push(this);

      return { cancel: vi.fn() };
    }),
  });

  return record;
};
