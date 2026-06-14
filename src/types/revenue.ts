/**
 * Domain model for a German restaurant Z-Bon / POS daily revenue report.
 *
 * Mirrors the backend `RevenueResponseDTO` returned by
 * `GET /api/v1/revenues` (paginated) and `POST /api/v1/revenues/extract`.
 */
export interface RevenueReport {
  id: number;
  storeName: string | null;
  reportDate: string | null; // generation / print date
  // Aggregation period (ISO yyyy-MM-dd). Daily Z-Bon ⇒ start == end; monthly/weekly ⇒ they differ.
  // Nullable + @JsonInclude(NON_NULL) on the backend, so they arrive as undefined when absent.
  reportStartDate: string | null;
  reportEndDate: string | null;
  reportNumber: string | null;
  posSystemName: string | null;
  tseZaehler: string | null;
  netRevenue: number;
  grossRevenue: number;
  taxAmount: number;
  taxAmount7: number;
  taxAmount19: number;
  taxRates: string | null;
  totalTransactions: number | null;

  // Payment-method breakdown (ZAHLUNGSARTEN)
  cashRevenue: number;
  cardRevenue: number;
  invoiceRevenue: number;
  voucherRevenue: number;
  paypalRevenue: number;
  creditCardRevenue: number;

  tipAmount: number; // Trinkgeld — NOT part of gross revenue

  // Forensic accounting (Full Audit Extraction). cashExpenses/staffTips are NOT NULL on the
  // backend (always present); discrepancyAmount is the Java-reconciled "genuinely unaccounted"
  // amount and accountingNotes is the AI/human explanation — both nullable, so @JsonInclude(NON_NULL)
  // may omit them (arrive as undefined).
  cashExpenses: number; // Barausgabe / Auslagen — cash taken out of the till
  staffTips: number; // Trinkgeldauszahlung — tips paid out to staff
  discrepancyAmount: number | null; // 0 (or absent) = reconciled; non-zero = unaccounted money
  accountingNotes: string | null;

  requiresManualReview: boolean; // CRITICAL FLAG FOR UI
  status: string;
}

/**
 * Aggregated revenue tax + audit statistics over an optional date window and
 * optional approval-status filter. Mirrors the backend
 * `RevenueTaxStatisticsResponse` (`GET /api/v1/revenues/statistics?from&to&status`).
 *
 * `totalTax === totalTax7 + totalTax19`. The audit totals
 * (`totalTipAmount`/`totalCashExpenses`/`totalStaffTips`/`totalDiscrepancy`) and
 * `reportsRequiringReview` mirror the Full-Audit fields. `periodStart`/`periodEnd`
 * echo the bounds actually applied (nullable → may arrive `undefined`).
 */
export interface RevenueTaxStatistics {
  totalTax7: number;
  totalTax19: number;
  totalTax: number;
  totalNetRevenue: number;
  totalGrossRevenue: number;
  reportCount: number;
  totalTipAmount: number;
  totalCashExpenses: number;
  totalStaffTips: number;
  totalDiscrepancy: number;
  reportsRequiringReview: number;
  periodStart: string | null;
  periodEnd: string | null;
}

/**
 * Payload for persisting a verified revenue report (POST /api/v1/revenues).
 * Required: storeName, reportNumber, netRevenue, grossRevenue.
 */
export type RevenueCreateRequest = {
  storeName: string;
  reportNumber: string;
  reportDate?: string | null;
  posSystemName?: string | null;
  tseZaehler?: string | null;
  netRevenue: number;
  grossRevenue: number;
  taxAmount?: number | null;
  taxAmount7?: number | null;
  taxAmount19?: number | null;
  taxRates?: string | null;
  totalTransactions?: number | null;
  cashRevenue?: number | null;
  cardRevenue?: number | null;
  invoiceRevenue?: number | null;
  voucherRevenue?: number | null;
  paypalRevenue?: number | null;
  creditCardRevenue?: number | null;
  tipAmount?: number | null;
};

/**
 * Fields editable in the revenue review dialog. The manual-review flag is driven
 * by the dual math check (tax identity + cashflow sum), so the accountant needs
 * to be able to reconcile the amounts as well as the identifiers.
 *
 * `accountingNotes` is editable: the AI pre-fills the discrepancy explanation and the
 * accountant may refine it before approving. The cash-out figures (`cashExpenses`/`staffTips`)
 * and the Java-reconciled `discrepancyAmount` are server-owned and intentionally NOT editable.
 */
export type EditableRevenueFields = Partial<
  Pick<
    RevenueReport,
    | "storeName"
    | "reportNumber"
    | "netRevenue"
    | "grossRevenue"
    | "taxAmount"
    | "taxAmount7"
    | "taxAmount19"
    | "cashRevenue"
    | "cardRevenue"
    | "invoiceRevenue"
    | "voucherRevenue"
    | "paypalRevenue"
    | "creditCardRevenue"
    | "tipAmount"
    | "accountingNotes"
  >
>;
