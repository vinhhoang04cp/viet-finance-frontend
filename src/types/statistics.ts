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

/** Always carries exactly 12 points (zero-filled for empty months). */
export interface MonthlyTaxStatistics {
  year: number;
  monthly: MonthlyTaxPoint[];
}
