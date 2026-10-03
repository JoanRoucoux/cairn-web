import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PortfolioImportStore } from './portfolio-import-store';

const CSV = 'account;accountType;institution;instrument;isinOrTicker;quantity;averageCost\r\n';

describe('PortfolioImportStore', () => {
  let store: PortfolioImportStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        PortfolioImportStore,
      ],
    });
    store = TestBed.inject(PortfolioImportStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should post the file content as text/csv', async () => {
    const imported = store.importFile(new File([CSV], 'portfolio.csv'));

    const request = await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBe(CSV);
    expect(request.request.headers.get('Content-Type')).toBe('text/csv');
    request.flush({ accountsCreated: 1, instrumentsCreated: 2, holdingsCreated: 3, holdingsUpdated: 4 });

    expect(await imported).toEqual({
      accountsCreated: 1,
      instrumentsCreated: 2,
      holdingsCreated: 3,
      holdingsUpdated: 4,
    });
    expect(store.rejections()).toEqual([]);
    expect(store.failed()).toBe(false);
    expect(store.importing()).toBe(false);
  });

  it('should keep every refused row so the whole file can be fixed at once', async () => {
    const imported = store.importFile(new File([CSV], 'portfolio.csv'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'))).flush(
      {
        status: 422,
        detail: 'Import rejected: 2 invalid row(s), nothing was written',
        errors: [
          { line: 2, code: 'UNKNOWN_ACCOUNT_TYPE', value: 'PEAA' },
          { line: 5, code: 'ZERO_QUANTITY' },
        ],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    expect(await imported).toBeNull();
    expect(store.rejections()).toHaveLength(2);
    expect(store.rejections()[0]).toMatchObject({ line: 2, code: 'UNKNOWN_ACCOUNT_TYPE', value: 'PEAA' });
    expect(store.failed()).toBe(false);
  });

  it('should report a failure that is not a rejection', async () => {
    const imported = store.importFile(new File([CSV], 'portfolio.csv'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    expect(await imported).toBeNull();
    expect(store.failed()).toBe(true);
    expect(store.rejections()).toEqual([]);
    expect(store.importing()).toBe(false);
  });

  it('should fall back to a plain failure when a 422 names no line', async () => {
    const imported = store.importFile(new File([CSV], 'portfolio.csv'));

    (await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'))).flush(
      { status: 422, errors: [] },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    await imported;
    expect(store.rejections()).toEqual([]);
    expect(store.failed()).toBe(true);
  });
  it('should clear the previous outcome when a new file is imported', async () => {
    const first = store.importFile(new File([CSV], 'portfolio.csv'));
    (await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });
    await first;

    const second = store.importFile(new File([CSV], 'portfolio.csv'));
    const request = await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'));
    expect(store.failed()).toBe(false);
    request.flush({ accountsCreated: 0, instrumentsCreated: 0, holdingsCreated: 0, holdingsUpdated: 1 });
    await second;
  });
});
