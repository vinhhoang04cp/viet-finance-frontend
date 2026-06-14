import type { MonthlyTaxPoint } from "@/types/statistics";

/** Short month labels for chart axes (Vietnamese). */
export const MONTH_SHORT_VI = [
  "T1", "T2", "T3", "T4", "T5", "T6",
  "T7", "T8", "T9", "T10", "T11", "T12",
];

/** Full month labels for the breakdown table (Vietnamese). */
export const MONTH_LONG_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

/** A 12-month zero-filled series (used as the loading / empty baseline). */
export function emptyMonthly(): MonthlyTaxPoint[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    totalTax7: 0,
    totalTax19: 0,
    totalTax: 0,
    totalNetRevenue: 0,
    totalGrossRevenue: 0,
    reportCount: 0,
  }));
}

/**
 * Sum two 12-point monthly series element-wise (used for the "All" module, which
 * combines invoices + revenues). Both inputs are assumed to be ordered Jan…Dec.
 */
export function mergeMonthly(
  a: MonthlyTaxPoint[],
  b: MonthlyTaxPoint[]
): MonthlyTaxPoint[] {
  return a.map((p, i) => {
    const q = b[i];
    return {
      month: p.month,
      totalTax7: p.totalTax7 + q.totalTax7,
      totalTax19: p.totalTax19 + q.totalTax19,
      totalTax: p.totalTax + q.totalTax,
      totalNetRevenue: p.totalNetRevenue + q.totalNetRevenue,
      totalGrossRevenue: p.totalGrossRevenue + q.totalGrossRevenue,
      reportCount: p.reportCount + q.reportCount,
    };
  });
}

/** Year totals derived from a monthly series (drives the stat cards + table footer). */
export function sumMonthly(points: MonthlyTaxPoint[]): Omit<MonthlyTaxPoint, "month"> {
  return points.reduce(
    (acc, p) => ({
      totalTax7: acc.totalTax7 + p.totalTax7,
      totalTax19: acc.totalTax19 + p.totalTax19,
      totalTax: acc.totalTax + p.totalTax,
      totalNetRevenue: acc.totalNetRevenue + p.totalNetRevenue,
      totalGrossRevenue: acc.totalGrossRevenue + p.totalGrossRevenue,
      reportCount: acc.reportCount + p.reportCount,
    }),
    {
      totalTax7: 0,
      totalTax19: 0,
      totalTax: 0,
      totalNetRevenue: 0,
      totalGrossRevenue: 0,
      reportCount: 0,
    }
  );
}
