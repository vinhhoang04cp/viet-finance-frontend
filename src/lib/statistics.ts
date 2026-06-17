import type { DateRange } from "@/lib/period";
import type { MonthlyTaxPoint, TimelinePoint } from "@/types/statistics";

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

// ── Continuous timeline (rolling N months, may span year boundaries) ─────────────

/** Options for the dashboard "range" selector — the rolling window length, in months. */
export const TIMELINE_RANGES = [
  { value: 6, label: "6 tháng gần nhất" },
  { value: 12, label: "12 tháng gần nhất" },
  { value: 24, label: "24 tháng gần nhất" },
] as const;

/** Default rolling window: the last 12 months. */
export const DEFAULT_TIMELINE_MONTHS = 12;

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Inclusive ISO {@link DateRange} for the last `months` calendar months (ending with the current
 * month), sent verbatim as the timeline endpoints' `from`/`to`. E.g. on 2026-06 with `months = 12`
 * → `2025-07-01 … 2026-06-30`.
 */
export function recentRange(months: number, now: Date = new Date()): DateRange {
  const end = new Date(now.getFullYear(), now.getMonth(), 1); // first day of current month
  const start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  return {
    from: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`,
    to: `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(lastDay)}`,
  };
}

/** The inclusive ISO range covering exactly the timeline point's own calendar month. */
export function monthRangeOf(p: { year: number; month: number }): DateRange {
  const lastDay = new Date(p.year, p.month, 0).getDate();
  return {
    from: `${p.year}-${pad2(p.month)}-01`,
    to: `${p.year}-${pad2(p.month)}-${pad2(lastDay)}`,
  };
}

/** Short axis label for a timeline point, e.g. "06/25". */
export function timelineShort(p: { year: number; month: number }): string {
  return `${pad2(p.month)}/${String(p.year).slice(2)}`;
}

/** Full label for a timeline point / table row, e.g. "Tháng 6/2025". */
export function timelineLong(p: { year: number; month: number }): string {
  return `Tháng ${p.month}/${p.year}`;
}

/**
 * Sum two timeline series element-wise (the "All" module = invoices + revenues). Both are assumed to
 * cover the SAME months in the same order (they share the request's `from`/`to`), so we align by index
 * and keep the left side's `year`/`month`.
 */
export function mergeTimeline(a: TimelinePoint[], b: TimelinePoint[]): TimelinePoint[] {
  return a.map((p, i) => {
    const q = b[i] ?? p;
    return {
      year: p.year,
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

/** Window totals derived from a timeline series (drives the stat cards + table footer). */
export function sumTimeline(points: TimelinePoint[]): Omit<MonthlyTaxPoint, "month"> {
  return sumMonthly(points as unknown as MonthlyTaxPoint[]);
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
