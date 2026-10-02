import { vi } from 'vitest';

export type MotionRecord = {
  highlighted: Element[];
  restore: () => void;
};

export const recordMotion = (): MotionRecord => {
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')!;
  const record: MotionRecord = {
    highlighted: [],
    restore: () => Object.defineProperty(Element.prototype, 'animate', original),
  };

  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: vi.fn(function (this: Element, keyframes: Keyframe[]) {
      if (keyframes.some((keyframe) => 'backgroundColor' in keyframe)) {
        record.highlighted.push(this);
      }

      return { cancel: vi.fn() };
    }),
  });

  return record;
};
