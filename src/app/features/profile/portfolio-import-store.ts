import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import type {
  ImportErrorResponse,
  ImportRejectionResponse,
  ImportReportResponse,
  ProblemDetail,
} from '@core/api-client/cairnAPI.schemas';
import { PortfolioService } from '@core/api-client/portfolio/portfolio.service';

export type ImportOutcome =
  | { readonly kind: 'imported'; readonly report: ImportReportResponse }
  | { readonly kind: 'rejected' }
  | { readonly kind: 'failed'; readonly reason: string | null };

@Injectable()
export class PortfolioImportStore {
  #portfolioApiClient = inject(PortfolioService);

  readonly importing = signal(false);
  readonly rejections = signal<ImportErrorResponse[]>([]);

  async importFile(file: File): Promise<ImportOutcome> {
    this.importing.set(true);
    this.rejections.set([]);

    try {
      const report = await firstValueFrom(
        // The endpoint consumes text/csv: a string body would otherwise go out as text/plain and get a 415.
        this.#portfolioApiClient.importPortfolio(await file.text(), {
          headers: new HttpHeaders({ 'Content-Type': 'text/csv' }),
        }),
      );
      return { kind: 'imported', report };
    } catch (error) {
      const rejected = rejectionOf(error);
      if (rejected) {
        this.rejections.set(rejected);

        return { kind: 'rejected' };
      }

      return { kind: 'failed', reason: reasonOf(error) };
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

function reasonOf(error: unknown): string | null {
  const detail = error instanceof HttpErrorResponse ? (error.error as ProblemDetail | null)?.detail?.trim() : null;

  return detail || null;
}
