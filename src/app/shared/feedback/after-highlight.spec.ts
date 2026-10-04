import { afterHighlight } from './after-highlight';

const animation = (keyframes: Keyframe[] | undefined): Animation =>
  ({ effect: keyframes ? { getKeyframes: () => keyframes } : null }) as unknown as Animation;

describe('afterHighlight', () => {
  afterEach(() => vi.useRealTimers());

  it('should wait until a target plays a background highlight', async () => {
    const element = document.createElement('div');
    const animations: Animation[] = [animation(undefined), animation([{ opacity: 0 }])];
    vi.spyOn(element, 'getAnimations').mockImplementation(() => animations);
    const done = vi.fn();

    afterHighlight(() => [element], done);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(done).not.toHaveBeenCalled();

    animations.push(animation([{ backgroundColor: 'var(--soft)' }]));

    await vi.waitFor(() => expect(done).toHaveBeenCalledOnce());
  });

  it('should give up after two seconds when nothing highlights', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] });
    const done = vi.fn();

    afterHighlight(() => [], done);
    vi.advanceTimersByTime(1900);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(done).toHaveBeenCalledOnce();
  });
});
