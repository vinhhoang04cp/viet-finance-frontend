import type { DocumentStatus } from "@/types/common";

/**
 * Domain model for an accounting invoice.
 *
 * This mirrors the `InvoiceResponse` DTO returned by the decoupled Spring Boot
 * backend (`GET /api/v1/invoices`).
 *
 * KISS: the backend Invoice module exposes only the core financial + vendor
 * fields. The § 14 UStG / SEPA fields (vendorVatId, vendorTaxId, iban, bic,
 * isPaid, dueDate) are NOT exposed — do not reintroduce them here without a
 * backend change. The approval `status` workflow, by contrast, IS supported
 * again (mirrors Revenue): `PATCH /api/v1/invoices/{id}/status`, and `status`
 * is orthogonal to the system-computed `requiresManualReview` flag.
 *
 * NOTE: the backend serializes with `@JsonInclude(NON_NULL)`, so nullable
 * fields are *omitted* from the JSON rather than sent as `null`. At runtime a
 * "missing" value therefore arrives as `undefined`. We keep the `| null`
 * contract below as specified, and every consumer treats absent / null / NaN
 * uniformly (see `formatCurrency` / `formatDate` and the `?? fallback` reads).
 */
export interface Invoice {
  id: number;
  invoiceNumber: string; // "UNKNOWN" if missing
  invoiceDate: string | null;
  vendorName: string | null;
  grossAmount: number;
  netAmount: number;
  taxAmount: number;
  taxAmount19: number;
  taxAmount7: number;
  taxRates: string | null;
  /** Approval lifecycle (Approval Station). Orthogonal to `requiresManualReview`. */
  status: DocumentStatus;
  requiresManualReview: boolean; // CRITICAL FLAG FOR UI
  /**
   * Stable reason codes explaining WHY the flag is set (MATH_UNBALANCED,
   * TAX19_BUCKET_IMPLAUSIBLE, INVOICE_NUMBER_MISSING, INVOICE_NUMBER_SUSPICIOUS).
   * Empty/undefined when clean. Server-owned — the UI only reads it.
   */
  reviewReasons?: string[];
}

/**
 * Fields the accountant may correct from the review dialog. Every amount is
 * editable because the server-owned `requiresManualReview` flag is driven by the
 * accounting math check (gross ≈ net + tax7 + tax19) plus the invoice-number
 * format rules — so the reviewer needs to reconcile the figures, not just the
 * identifiers. Sent as a partial body to `PATCH /api/v1/invoices/{id}`.
 */
export type EditableInvoiceFields = Partial<
  Pick<
    Invoice,
    | "vendorName"
    | "invoiceNumber"
    | "netAmount"
    | "grossAmount"
    | "taxAmount"
    | "taxAmount7"
    | "taxAmount19"
    | "taxRates"
  >
>;

/**
 * Aggregated invoice tax statistics over an optional date window.
 * Mirrors the backend `InvoiceTaxStatisticsResponse`
 * (`GET /api/v1/invoices/statistics?from&to`).
 *
 * `totalTax === totalTax7 + totalTax19`. `periodStart` / `periodEnd` echo the
 * bounds actually applied (nullable → may arrive `undefined` when unbounded).
 */
export interface InvoiceTaxStatistics {
  totalTax7: number;
  totalTax19: number;
  totalTax: number;
  totalNetRevenue: number;
  totalGrossRevenue: number;
  reportCount: number;
  periodStart: string | null;
  periodEnd: string | null;
}

/**
 * Payload for persisting a verified invoice (POST /api/v1/invoices).
 * Required by the backend: vendorName, invoiceDate, invoiceNumber, netAmount,
 * grossAmount. Dates are ISO `yyyy-MM-dd` strings.
 */
export type InvoiceCreateRequest = {
  vendorName: string;
  invoiceDate: string;
  invoiceNumber: string;
  netAmount: number;
  grossAmount: number;
  taxAmount?: number | null;
  taxAmount7?: number | null;
  taxAmount19?: number | null;
  taxRates?: string | null;
};
