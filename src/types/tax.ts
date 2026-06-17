/**
 * Thuế GTGT phải nộp (Zahllast) — mirror của backend `VatCalculationResponse`
 * (`GET /api/v1/tax/calculation`). Zahllast = thuế đầu ra (Revenue) − thuế đầu vào
 * (Invoice), tách theo 7% / 19%.
 */

import type { InvoiceLineItem, RevenueLineItem } from "@/types/statistics";

export type VatStatus = "PAYABLE" | "REFUNDABLE" | "BALANCED";

export interface VatCalculation {
  /** ISO `yyyy-MM-dd`; có thể `null` khi không giới hạn kỳ. */
  periodStart: string | null;
  periodEnd: string | null;
  periodLabel: string;

  // Thuế đầu ra (Umsatzsteuer)
  outputTax7: number;
  outputTax19: number;
  totalOutputTax: number;
  totalNetRevenue: number;
  totalGrossRevenue: number;
  revenueReportCount: number;

  // Thuế đầu vào (Vorsteuer)
  inputTax7: number;
  inputTax19: number;
  totalInputTax: number;
  totalNetExpense: number;
  totalGrossExpense: number;
  invoiceCount: number;

  // Zahllast
  vatPayable7: number;
  vatPayable19: number;
  totalVatPayable: number;
  status: VatStatus;
}

/**
 * Chi tiết drill-down một kỳ — mirror của backend `VatDetailsResponse`
 * (`GET /api/v1/tax/calculation/details`): dòng hóa đơn (đầu vào) + báo cáo doanh thu (đầu ra).
 */
export interface VatDetails {
  invoices: InvoiceLineItem[];
  revenues: RevenueLineItem[];
}
