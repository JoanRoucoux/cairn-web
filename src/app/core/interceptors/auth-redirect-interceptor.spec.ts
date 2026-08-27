import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { authRedirectInterceptor } from './auth-redirect-interceptor';

describe('authRedirectInterceptor', () => {
  let assign: ReturnType<typeof vi.fn>;
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    assign = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authRedirectInterceptor])),
        provideHttpClientTesting(),
        {
          provide: DOCUMENT,
          useValue: { defaultView: { location: { assign } } },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('should send the browser to the sign-in page on a 401', async () => {
    http.get('/api/portfolio').subscribe({ error: () => undefined });

    controller.expectOne('/api/portfolio').flush(null, { status: 401, statusText: 'Unauthorized' });

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/login'));
  });

  it('should leave other error statuses alone', async () => {
    http.get('/api/portfolio').subscribe({ error: () => undefined });

    controller.expectOne('/api/portfolio').flush(null, { status: 422, statusText: 'Unprocessable' });

    expect(assign).not.toHaveBeenCalled();
  });

  it('should not redirect on a failing logout, which would loop', async () => {
    http.post('/logout', null).subscribe({ error: () => undefined });

    controller.expectOne('/logout').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(assign).not.toHaveBeenCalled();
  });
});
