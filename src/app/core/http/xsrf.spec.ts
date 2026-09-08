import { HttpClient, provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from './xsrf';

/**
 * These two names are one half of a contract whose other half lives in another repository, in
 * Spring's CookieCsrfTokenRepository. They are asserted here against literals rather than against
 * the constants they configure, because a test that reads the same constant it configures would
 * agree with any rename, including the one that shipped: the application sent X-CSRF-TOKEN, the
 * server read X-XSRF-TOKEN, and every write was rejected while every read went through.
 */
describe('XSRF configuration', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXsrfConfiguration({ cookieName: XSRF_COOKIE_NAME, headerName: XSRF_HEADER_NAME })),
        provideHttpClientTesting(),
      ],
    });
    document.cookie = `${XSRF_COOKIE_NAME}=a-token-from-the-server`;
  });

  it('should echo the cookie in the header Spring reads', () => {
    TestBed.inject(HttpClient).post('/api/anything', null).subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne('/api/anything');

    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('a-token-from-the-server');
    request.flush(null);
  });

  it('should read the cookie Spring writes', () => {
    expect(XSRF_COOKIE_NAME).toBe('XSRF-TOKEN');
  });
});
