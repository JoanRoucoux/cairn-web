import ngswConfig from '../../ngsw-config.json';

/**
 * The service worker decides which navigations it answers from its own cache instead of letting
 * them reach the server, and Angular's default claims every URL whose last segment has no dot.
 * That silently includes the pages Spring Security serves: the browser asked for /login, the
 * worker handed back index.html, the application found no such route, its session call took a
 * 401 and sent the browser back to /login. An unbreakable loop, and invisible to curl.
 */
describe('service worker navigation', () => {
  it.each(['!/api/**', '!/login', '!/login/**', '!/logout', '!/logout/**', '!/webauthn/**', '!/error'])(
    'should let %s reach the server, Spring Security owning it',
    (exclusion) => {
      expect(ngswConfig.navigationUrls).toContain(exclusion);
    },
  );

  it('should still answer the application own routes from the cache', () => {
    expect(ngswConfig.navigationUrls).toContain('/**');
  });
});
