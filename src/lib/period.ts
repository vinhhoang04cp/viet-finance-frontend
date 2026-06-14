/**
 * Period (month / year) filter model shared by the list pages and the dashboard.
 *
 * A {@link Period} is converted to an inclusive ISO `yyyy-MM-dd` {@link DateRange}
 * that maps 1:1 onto the backend statistics endpoints' `from` / `to` query params
 * (`null` = unbounded on that side → aggregate everything).
 */

/** `"all"` on a field disables that dimension of the filter. */
export interface Period {
  year: number | "all";
  /** Ignored when `year === "all"`; `"all"` means the whole selected year. */
  month: number | "all";
}

/** Inclusive ISO date range; `null` = unbounded (the backend treats it as no filter). */
export interface DateRange {
  from: string | null;
  to: string | null;
}

/** The "show everything" period — the default on the list pages. */
export const ALL_PERIOD: Period = { year: "all", month: "all" };

/** Years offered in the filter: the current year and the four preceding ones. */
export function availableYears(now: Date = new Date()): number[] {
  const current = now.getFullYear();
  return [0, 1, 2, 3, 4].map((offset) => current - offset);
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Last calendar day of a 1-based month (handles leap Februaries). */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Convert a {@link Period} into the inclusive {@link DateRange} sent to the API.
 *
 * - `year = "all"` → `{ from: null, to: null }` (no date filter)
 * - `month = "all"` → the whole year (`Y-01-01` … `Y-12-31`)
 * - a specific month → its first … last calendar day
 */
export function periodToRange(period: Period): DateRange {
  if (period.year === "all") {
    return { from: null, to: null };
  }
  const year = period.year;
  if (period.month === "all") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  const month = period.month;
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`,
  };
}

/**
 * Predicate: does an ISO `yyyy-MM-dd` date fall inside the period?
 *
 * Used to filter the already-fetched list rows client-side so the table and the
 * (server-aggregated) summary bar reflect the same window. A `null`/absent date
 * is excluded once any bound is set, and everything passes when the period is "all".
 */
export function isDateInPeriod(
  isoDate: string | null | undefined,
  range: DateRange
): boolean {
  if (range.from === null && range.to === null) return true;
  if (!isoDate) return false;
  const day = isoDate.slice(0, 10); // tolerate a trailing time component
  if (range.from !== null && day < range.from) return false;
  if (range.to !== null && day > range.to) return false;
  return true;
}
