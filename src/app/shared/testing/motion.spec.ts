import { recordMotion } from './motion';

describe('recordMotion', () => {
  it('records the highlights only, not the slides, then gives the previous animate back', () => {
    const before = Element.prototype.animate;
    const motion = recordMotion();
    const row = document.createElement('div');
    const next = document.createElement('div');

    row.animate([{ backgroundColor: 'var(--soft)', offset: 0 }, { offset: 1 }], 1400);
    next.animate([{ transform: 'translateY(60px)' }, { transform: 'translateY(0)' }], 260);

    expect(motion.highlighted).toEqual([row]);

    motion.restore();

    expect(Element.prototype.animate).toBe(before);
  });
});
