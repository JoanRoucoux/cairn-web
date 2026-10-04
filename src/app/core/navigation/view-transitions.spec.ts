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

const navigate = (
  from: [string, Record<string, string>?],
  to: [string, Record<string, string>?],
): { skipTransition: ReturnType<typeof vi.fn> } => {
  const transition = { skipTransition: vi.fn() };

  TestBed.runInInjectionContext(() =>
    onViewTransitionCreated({
      transition,
      from: snapshot(...from),
      to: snapshot(...to),
    } as unknown as ViewTransitionInfo),
  );

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
  ])('skips the swap between the shell destinations %s and %s', (from, to) => {
    mockMedia({});

    expect(navigate([from], [to]).skipTransition).toHaveBeenCalledOnce();
  });

  it('skips a navigation that only changes query parameters', () => {
    mockMedia({});

    expect(navigate(['/holdings'], ['/holdings', { classe: 'etf' }]).skipTransition).toHaveBeenCalledOnce();
    expect(navigate(['/holdings/h1'], ['/holdings/h1', { classe: 'etf' }]).skipTransition).toHaveBeenCalledOnce();
  });

  it.each([
    ['/holdings', '/holdings/h1'],
    ['/holdings/h1', '/holdings'],
    ['/profile', '/'],
    ['/nowhere', '/'],
    ['/', '/profile'],
  ])('keeps the cross-fade from %s to %s', (from, to) => {
    mockMedia({});

    expect(navigate([from], [to]).skipTransition).not.toHaveBeenCalled();
  });

  it('skips the list and detail swap beside the panel on desktop', () => {
    mockMedia({ [DESKTOP]: true });

    expect(navigate(['/holdings'], ['/holdings/h1']).skipTransition).toHaveBeenCalledOnce();
    expect(navigate(['/holdings/h1'], ['/holdings/h2']).skipTransition).toHaveBeenCalledOnce();
    expect(navigate(['/holdings/h1'], ['/holdings']).skipTransition).toHaveBeenCalledOnce();
  });

  it('keeps the cross-fade away from holdings on desktop', () => {
    mockMedia({ [DESKTOP]: true });

    expect(navigate(['/profile'], ['/']).skipTransition).not.toHaveBeenCalled();
    expect(navigate(['/holdings/h1'], ['/profile']).skipTransition).not.toHaveBeenCalled();
  });

  it('skips every transition under reduced motion', () => {
    mockMedia({ [REDUCED]: true });

    expect(navigate(['/profile'], ['/']).skipTransition).toHaveBeenCalledOnce();
  });
});
