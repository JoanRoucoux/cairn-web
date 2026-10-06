import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

import { onViewTransitionCreated } from './view-transitions';

const snapshot = (path: string, queryParams: Record<string, string> = {}): ActivatedRouteSnapshot => {
  const segments = path.split('/').filter(Boolean);
  const chain: Record<string, unknown>[] = [
    { url: [], firstChild: null },
    ...segments.map((segment) => ({ url: [{ path: segment }], firstChild: null })),
  ];

  chain.forEach((route, index) =>
    Object.assign(route, { firstChild: chain[index + 1] ?? null, pathFromRoot: chain.slice(0, index + 1) }),
  );

  return Object.assign(chain[0]!, { queryParams }) as unknown as ActivatedRouteSnapshot;
};

const mockMedia = (matches: Record<string, boolean>): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: matches[query] ?? false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
};

const REDUCED = '(prefers-reduced-motion: reduce)';
const DESKTOP = '(min-width: 1024px)';

type FakeTransition = { ready: Promise<void>; skipTransition: ReturnType<typeof vi.fn> };

const start = (
  from: [string, Record<string, string>?],
  to: [string, Record<string, string>?],
  ready: Promise<void> = Promise.resolve(),
): FakeTransition => {
  const transition = { ready, skipTransition: vi.fn() };

  TestBed.runInInjectionContext(() =>
    onViewTransitionCreated({
      transition,
      from: snapshot(...from),
      to: snapshot(...to),
    } as unknown as ViewTransitionInfo),
  );

  return transition;
};

const navigate = async (
  from: [string, Record<string, string>?],
  to: [string, Record<string, string>?],
): Promise<FakeTransition> => {
  const transition = start(from, to);
  await transition.ready;
  await Promise.resolve();

  return transition;
};

describe('onViewTransitionCreated', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['/', '/holdings'],
    ['/holdings', '/allocation'],
    ['/allocation', '/accounts'],
    ['/accounts', '/'],
    ['/accounts', '/holdings'],
  ])('skips the swap between the shell destinations %s and %s', async (from, to) => {
    mockMedia({});

    expect((await navigate([from], [to])).skipTransition).toHaveBeenCalledOnce();
  });

  it('skips a navigation that only changes query parameters', async () => {
    mockMedia({});

    expect((await navigate(['/holdings'], ['/holdings', { classe: 'etf' }])).skipTransition).toHaveBeenCalledOnce();
    expect(
      (await navigate(['/holdings/h1'], ['/holdings/h1', { classe: 'etf' }])).skipTransition,
    ).toHaveBeenCalledOnce();
  });

  it.each([
    ['/holdings', '/holdings/h1'],
    ['/holdings/h1', '/holdings'],
    ['/profile', '/'],
    ['/nowhere', '/'],
    ['/', '/profile'],
  ])('keeps the cross-fade from %s to %s', async (from, to) => {
    mockMedia({});

    expect((await navigate([from], [to])).skipTransition).not.toHaveBeenCalled();
  });

  it('skips the list and detail swap beside the panel on desktop', async () => {
    mockMedia({ [DESKTOP]: true });

    expect((await navigate(['/holdings'], ['/holdings/h1'])).skipTransition).toHaveBeenCalledOnce();
    expect((await navigate(['/holdings/h1'], ['/holdings/h2'])).skipTransition).toHaveBeenCalledOnce();
    expect((await navigate(['/holdings/h1'], ['/holdings'])).skipTransition).toHaveBeenCalledOnce();
  });

  it('keeps the cross-fade away from holdings on desktop', async () => {
    mockMedia({ [DESKTOP]: true });

    expect((await navigate(['/profile'], ['/'])).skipTransition).not.toHaveBeenCalled();
    expect((await navigate(['/holdings/h1'], ['/profile'])).skipTransition).not.toHaveBeenCalled();
  });

  it('skips every transition under reduced motion', async () => {
    mockMedia({ [REDUCED]: true });

    expect((await navigate(['/profile'], ['/'])).skipTransition).toHaveBeenCalledOnce();
  });

  it('waits for the transition to be ready before skipping it, so its ready promise never rejects', async () => {
    mockMedia({});
    let ready!: () => void;
    const transition = start(['/'], ['/holdings'], new Promise<void>((resolve) => (ready = resolve)));
    await Promise.resolve();

    expect(transition.skipTransition).not.toHaveBeenCalled();

    ready();
    await transition.ready;
    await Promise.resolve();

    expect(transition.skipTransition).toHaveBeenCalledOnce();
  });

  it('leaves alone a transition that never gets ready', async () => {
    mockMedia({});
    const transition = start(
      ['/'],
      ['/holdings'],
      Promise.reject(new DOMException('Duplicate name', 'InvalidStateError')),
    );
    await transition.ready.catch(() => undefined);
    await Promise.resolve();

    expect(transition.skipTransition).not.toHaveBeenCalled();
  });
});
