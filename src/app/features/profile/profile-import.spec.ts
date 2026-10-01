import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslocoScope } from '@jsverse/transloco';
import { render, screen, within } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';

import { getTranslocoTestingModule } from '@shared/testing/transloco-testing';

import { PortfolioImportStore } from './portfolio-import-store';
import { ProfilePage } from './profile-page';
import { ProfileStore } from './profile-store';
import { settleProfile } from './profile-testing';

const CSV_HEADER = 'account;accountType;institution;instrument;isinOrTicker;quantity;averageCost';

const csvFile = (): File =>
  new File(
    [
      `${CSV_HEADER}
`,
    ],
    'portfolio.csv',
    { type: 'text/csv' },
  );

describe('ProfilePage import and export', () => {
  let httpTesting: HttpTestingController;

  const renderPage = async (): Promise<void> => {
    localStorage.clear();
    await render(ProfilePage, {
      imports: [getTranslocoTestingModule()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoScope('profile'),
        ProfileStore,
        PortfolioImportStore,
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    await settleProfile(httpTesting);
  };

  afterEach(() => httpTesting.verify());

  it('should hand the export to the browser as a download', async () => {
    await renderPage();

    const link = screen.getByTestId('export-csv');

    expect(link).toHaveAttribute('href', '/api/portfolio/export');
    expect(link).toHaveAttribute('download');
  });

  it('should hand the import template to the browser as a download', async () => {
    await renderPage();

    const link = screen.getByTestId('import-template');

    expect(link).toHaveAttribute('href', '/api/portfolio/import/template');
    expect(link).toHaveAttribute('download');
  });

  it('should report what an accepted import changed', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.upload(screen.getByTestId('import-file'), csvFile());

    (await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'))).flush({
      accountsCreated: 1,
      instrumentsCreated: 2,
      holdingsCreated: 3,
      holdingsUpdated: 4,
    });

    expect(await screen.findByTestId('import-report')).toBeInTheDocument();
    expect(screen.queryByTestId('import-rejections')).not.toBeInTheDocument();
  });

  it('should list every refused line so the file can be fixed in one pass', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.upload(screen.getByTestId('import-file'), csvFile());

    (await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'))).flush(
      {
        status: 422,
        errors: [
          { line: 2, code: 'UNKNOWN_ACCOUNT_TYPE', value: 'PEAA' },
          { line: 5, code: 'ZERO_QUANTITY' },
        ],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    const rejections = await screen.findByTestId('import-rejections');

    expect(rejections).toBeInTheDocument();
    expect(await within(rejections).findByText('2')).toBeInTheDocument();
    expect(within(rejections).getByText('5')).toBeInTheDocument();
    expect(screen.queryByTestId('import-report')).not.toBeInTheDocument();
  });

  it('should open the file picker from the visible button, the input being hidden', async () => {
    const user = userEvent.setup();
    await renderPage();
    const input = screen.getByTestId('import-file');
    const opened = vi.spyOn(input, 'click');

    await user.click(screen.getByTestId('import-csv'));

    expect(opened).toHaveBeenCalled();
  });

  it('should say so when the import could not be sent at all', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.upload(screen.getByTestId('import-file'), csvFile());

    (await vi.waitFor(() => httpTesting.expectOne('/api/portfolio/import'))).flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    expect(await screen.findByTestId('import-failed')).toBeInTheDocument();
    expect(screen.queryByTestId('import-rejections')).not.toBeInTheDocument();
  });

  it('should send nothing when the file picker is dismissed', async () => {
    await renderPage();

    // A cancelled picker still fires change, with no file on it.
    screen.getByTestId('import-file').dispatchEvent(new Event('change'));

    httpTesting.expectNone('/api/portfolio/import');
  });
});
