import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import type {
  ImportErrorResponse,
  ImportRejectionResponse,
  ImportReportResponse,
} from '@core/api-client/cairnAPI.schemas';
import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

@Injectable()
export class PortfolioImportStore {
  #portfolioApiClient = inject(PortfolioService);

  readonly importing = signal(false);
  readonly report = signal<ImportReportResponse | null>(null);
  /** Rows the server refused, kept whole: the point of its 422 is that the file is fixed in one pass. */
  readonly rejections = signal<ImportErrorResponse[]>([]);
  /** Anything that is not a rejection, which carries no rows to show. */
  readonly failed = signal(false);

  async importFile(file: File): Promise<void> {
    this.importing.set(true);
    this.report.set(null);
    this.rejections.set([]);
    this.failed.set(false);

    try {
      const report = await firstValueFrom(
        // The endpoint declares consumes = "text/csv"; a string body would otherwise be sent as
        // text/plain and refused with 415.
        this.#portfolioApiClient.importPortfolio(await file.text(), {
          headers: new HttpHeaders({ 'Content-Type': 'text/csv' }),
        }),
      );
      this.report.set(report);
    } catch (error) {
      const rejected = rejectionOf(error);
      if (rejected) {
        this.rejections.set(rejected);
      } else {
        this.failed.set(true);
      }
    } finally {
      this.importing.set(false);
    }
  }
}

function rejectionOf(error: unknown): ImportErrorResponse[] | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 422) {
    return null;
  }

  const body = error.error as ImportRejectionResponse | null;

  return body?.errors?.length ? body.errors : null;
}
