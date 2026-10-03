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
  readonly rejections = signal<ImportErrorResponse[]>([]);
  readonly failed = signal(false);

  async importFile(file: File): Promise<ImportReportResponse | null> {
    this.importing.set(true);
    this.rejections.set([]);
    this.failed.set(false);

    try {
      const report = await firstValueFrom(
        // The endpoint consumes text/csv: a string body would otherwise go out as text/plain and get a 415.
        this.#portfolioApiClient.importPortfolio(await file.text(), {
          headers: new HttpHeaders({ 'Content-Type': 'text/csv' }),
        }),
      );
      return report;
    } catch (error) {
      const rejected = rejectionOf(error);
      if (rejected) {
        this.rejections.set(rejected);
      } else {
        this.failed.set(true);
      }

      return null;
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
