/**
 * Per-month tax statistics shared by the dashboard charts + breakdown table.
 * Mirrors the backend monthly response DTOs
 * (`GET /api/v1/{invoices|revenues}/statistics/monthly?year=`).
 *
 * The invoice and revenue monthly points are intentionally the SAME lean shape
 * (the forensic audit totals stay on the windowed `/statistics` endpoint), so a
 * single type serves both and lets the dashboard merge them for the "All" module.
 */

/** One month's slice; `month` is 1-based (1 = January). `totalTax = totalTax7 + totalTax19`. */
export interface MonthlyTaxPoint {
  month: number;
  totalTax7: number;
  totalTax19: number;
  totalTax: number;
  totalNetRevenue: number;
  totalGrossRevenue: number;
  reportCount: number;
}

/**
 * Always carries exactly 12 points (zero-filled for empty months).
 * `year` is `null` when the breakdown aggregates every month across all years.
 */
export interface MonthlyTaxStatistics {
  year: number | null;
  monthly: MonthlyTaxPoint[];
}

/**
 * One month on a CONTINUOUS timeline — mirrors the backend `{Invoice,Revenue}TimelineResponse.Point`
 * (`GET /api/v1/{invoices|revenues}/statistics/timeline?from&to`). Unlike {@link MonthlyTaxPoint}
 * (12 buckets within one year), each point carries its own `year` + `month`, so the dashboard can
 * render a rolling window that spans year boundaries (e.g. the last 12 months). `month` is 1-based.
 */
export interface TimelinePoint {
  year: number;
  month: number;
  totalTax7: number;
  totalTax19: number;
  totalTax: number;
  totalNetRevenue: number;
  totalGrossRevenue: number;
  reportCount: number;
}

/** Backend `{Invoice,Revenue}TimelineResponse` envelope (same shape for both modules). */
export interface TaxTimeline {
  points: TimelinePoint[];
}

/** One invoice row (input tax / Vorsteuer) — mirrors backend `InvoiceTaxLineItem`. */
export interface InvoiceLineItem {
  invoiceId: number;
  invoiceNumber?: string | null;
  vendorName?: string | null;
  invoiceDate?: string | null;
  netAmount?: number | null;
  taxAmount7?: number | null;
  taxAmount19?: number | null;
  grossAmount?: number | null;
}

/** One revenue-report row (output tax / Umsatzsteuer) — mirrors backend `RevenueTaxLineItem`. */
export interface RevenueLineItem {
  reportId: number;
  reportNumber?: string | null;
  branchName?: string | null;
  reportDate?: string | null;
  netRevenue?: number | null;
  taxAmount7?: number | null;
  taxAmount19?: number | null;
  grossRevenue?: number | null;
  posSystemName?: string | null;
  status?: string | null;
}
