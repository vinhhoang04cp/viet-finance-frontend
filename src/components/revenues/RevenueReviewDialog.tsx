"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Save, ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/forms/LabeledInput";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";
import type { EditableRevenueFields, RevenueReport } from "@/types/revenue";

interface RevenueReviewDialogProps {
  report: RevenueReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persist field corrections (PATCH). */
  onSave: (id: number, changes: EditableRevenueFields) => Promise<void>;
  /** Persist corrections, then transition status to APPROVED (may 409). */
  onApprove: (id: number, changes: EditableRevenueFields) => Promise<void>;
}

function ReadOnlyField({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  /** Container override — used to tint the discrepancy field red/green. */
  className?: string;
  /** Value-text override — used to colour the discrepancy amount. */
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border bg-muted/30 p-3",
        className
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-sm tabular-nums", valueClassName)}>{value}</span>
    </div>
  );
}

/** Parse a numeric string -> number | null (blank becomes null). */
function num(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

/**
 * Nhãn tiếng Việt cho các reason code do backend trả về (RevenueReport.reviewReasons()).
 * Cho người duyệt biết RÕ ô nào cần sửa thay vì badge "Cần kiểm tra" trống. Code lạ → hiện thẳng code.
 */
const REVIEW_REASON_LABELS: Record<string, string> = {
  TAX_TOTAL_UNBALANCED:
    "Tổng không khớp: Doanh thu thuần + Tổng thuế ≠ Tổng doanh thu (thường do thiếu phần doanh thu thuế suất 0% trong Doanh thu thuần).",
  TAX_BREAKDOWN_MISMATCH:
    "Phân rã thuế lệch: Thuế 7% + Thuế 19% ≠ Tổng thuế.",
  CASHFLOW_DISCREPANCY:
    "Dòng tiền chưa đối soát: tổng các phương thức thanh toán không khớp Tổng doanh thu.",
};

/**
 * Header date label. Shows the aggregation period when present: a single date for a daily Z-Bon
 * (start == end), or "start - end" for a monthly/weekly aggregate. Falls back to the generation
 * date (reportDate) when the period is absent (older rows / image PDFs). ISO strings are canonical
 * "yyyy-MM-dd", so string equality is a safe same-day check.
 */
function periodLabel(report: RevenueReport): string {
  const start = report.reportStartDate;
  const end = report.reportEndDate;
  if (start && end) {
    return start === end
      ? formatDate(start)
      : `${formatDate(start)} - ${formatDate(end)}`;
  }
  return formatDate(start ?? end ?? report.reportDate);
}

/**
 * Editable form for one revenue report. State is initialised from props and the
 * parent remounts it with `key={report.id}` (no `useEffect` sync). Every amount
 * is editable because the manual-review flag is driven by the dual math check.
 *
 * Two actions: Save changes (PATCH) and Approve (PATCH + status APPROVED, which
 * the backend rejects with 409 when the figures don't reconcile).
 */
function ReviewForm({
  report,
  onSave,
  onApprove,
  onClose,
}: {
  report: RevenueReport;
  onSave: (id: number, changes: EditableRevenueFields) => Promise<void>;
  onApprove: (id: number, changes: EditableRevenueFields) => Promise<void>;
  onClose: () => void;
}) {
  const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const [form, setForm] = React.useState<Record<string, string>>({
    storeName: str(report.storeName),
    reportNumber: str(report.reportNumber),
    netRevenue: str(report.netRevenue),
    grossRevenue: str(report.grossRevenue),
    taxAmount: str(report.taxAmount),
    taxAmount7: str(report.taxAmount7),
    taxAmount19: str(report.taxAmount19),
    cashRevenue: str(report.cashRevenue),
    cardRevenue: str(report.cardRevenue),
    invoiceRevenue: str(report.invoiceRevenue),
    voucherRevenue: str(report.voucherRevenue),
    paypalRevenue: str(report.paypalRevenue),
    creditCardRevenue: str(report.creditCardRevenue),
    tipAmount: str(report.tipAmount),
    accountingNotes: str(report.accountingNotes),
  });
  const [busy, setBusy] = React.useState<null | "save" | "approve">(null);
  const [error, setError] = React.useState<string | null>(null);
  const { canWrite } = useAuth();

  const isApproved = report.status?.toUpperCase() === "APPROVED";
  const set = (key: string) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Discrepancy is the Java-reconciled "genuinely unaccounted" amount. Absent/0 → reconciled.
  const discrepancy = report.discrepancyAmount ?? 0;
  const hasDiscrepancy = discrepancy !== 0;

  function collect(): EditableRevenueFields {
    const changes: EditableRevenueFields = {};
    if (form.storeName.trim()) changes.storeName = form.storeName.trim();
    if (form.reportNumber.trim()) changes.reportNumber = form.reportNumber.trim();
    const numericKeys = [
      "netRevenue",
      "grossRevenue",
      "taxAmount",
      "taxAmount7",
      "taxAmount19",
      "cashRevenue",
      "cardRevenue",
      "invoiceRevenue",
      "voucherRevenue",
      "paypalRevenue",
      "creditCardRevenue",
      "tipAmount",
    ] as const;
    for (const k of numericKeys) {
      const n = num(form[k]);
      if (n !== null) changes[k] = n;
    }
    // Accounting notes: the AI pre-fills them and the accountant may refine the discrepancy
    // explanation before approving. Send the edited text, but on an EMPTY field send `null`
    // so the backend PATCH coalesce RETAINS the stored AI note (rather than clearing it with
    // ""). The read-only audit figures (cashExpenses, staffTips, discrepancyAmount) are
    // server-owned and deliberately not sent back.
    const notes = form.accountingNotes.trim();
    changes.accountingNotes = notes === "" ? null : notes;
    return changes;
  }

  async function run(
    action: "save" | "approve",
    fn: (id: number, changes: EditableRevenueFields) => Promise<void>
  ) {
    setBusy(action);
    setError(null);
    try {
      await fn(report.id, collect());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác thất bại.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <DialogTitle>{report.storeName ?? "Chi nhánh không xác định"}</DialogTitle>
          {report.requiresManualReview && (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3" />
              Cần kiểm tra
            </Badge>
          )}
        </div>
        <DialogDescription>
          Báo cáo #{report.id} &middot; {report.reportNumber ?? "không có mã"}{" "}
          &middot; {periodLabel(report)}
        </DialogDescription>
      </DialogHeader>

      {/* Vì sao báo cáo bị gắn cờ — chỉ rõ ô cần sửa. */}
      {report.requiresManualReview && (report.reviewReasons?.length ?? 0) > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Lý do cần kiểm tra
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-800">
            {report.reviewReasons!.map((code) => (
              <li key={code}>{REVIEW_REASON_LABELS[code] ?? code}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Read-only context */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReadOnlyField label="Hệ thống POS" value={report.posSystemName ?? "—"} />
        <ReadOnlyField label="Z-Bon / TSE" value={report.tseZaehler ?? "—"} />
        <ReadOnlyField
          label="Số giao dịch"
          value={report.totalTransactions ?? "—"}
        />
        <ReadOnlyField label="Mức thuế" value={report.taxRates ?? "—"} />
      </div>

      {/* Editable: revenue + tax */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Doanh thu &amp; Thuế (EUR)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <LabeledInput id="storeName" label="Chi nhánh" value={form.storeName} onChange={set("storeName")} className="col-span-2 sm:col-span-3" />
          <LabeledInput id="reportNumber" label="Mã báo cáo" mono value={form.reportNumber} onChange={set("reportNumber")} className="col-span-2 sm:col-span-3" />
          <LabeledInput id="netRevenue" label="Doanh thu thuần" type="number" step="0.01" value={form.netRevenue} onChange={set("netRevenue")} />
          <LabeledInput id="taxAmount" label="Tổng thuế" type="number" step="0.01" value={form.taxAmount} onChange={set("taxAmount")} />
          <LabeledInput id="grossRevenue" label="Tổng doanh thu" type="number" step="0.01" value={form.grossRevenue} onChange={set("grossRevenue")} />
          <LabeledInput id="taxAmount7" label="Thuế 7%" type="number" step="0.01" value={form.taxAmount7} onChange={set("taxAmount7")} />
          <LabeledInput id="taxAmount19" label="Thuế 19%" type="number" step="0.01" value={form.taxAmount19} onChange={set("taxAmount19")} />
          <LabeledInput id="tipAmount" label="Tiền Tip" type="number" step="0.01" value={form.tipAmount} onChange={set("tipAmount")} />
        </div>
      </section>

      {/* Editable: payment breakdown */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Phương thức thanh toán
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <LabeledInput id="cashRevenue" label="Tiền mặt" type="number" step="0.01" value={form.cashRevenue} onChange={set("cashRevenue")} />
          <LabeledInput id="cardRevenue" label="Thẻ EC" type="number" step="0.01" value={form.cardRevenue} onChange={set("cardRevenue")} />
          <LabeledInput id="creditCardRevenue" label="Thẻ tín dụng" type="number" step="0.01" value={form.creditCardRevenue} onChange={set("creditCardRevenue")} />
          <LabeledInput id="paypalRevenue" label="PayPal" type="number" step="0.01" value={form.paypalRevenue} onChange={set("paypalRevenue")} />
          <LabeledInput id="voucherRevenue" label="Voucher" type="number" step="0.01" value={form.voucherRevenue} onChange={set("voucherRevenue")} />
          <LabeledInput id="invoiceRevenue" label="Ghi nợ" type="number" step="0.01" value={form.invoiceRevenue} onChange={set("invoiceRevenue")} />
        </div>
      </section>

      {/* Read-only: forensic reconciliation & cash-outs */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Đối soát &amp; Chi phí
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ReadOnlyField
            label="Chi tiền mặt"
            value={formatCurrency(report.cashExpenses)}
          />
          <ReadOnlyField
            label="Trích trả Tip"
            value={formatCurrency(report.staffTips)}
          />
          <ReadOnlyField
            label="Chênh lệch"
            value={formatCurrency(discrepancy)}
            className={
              hasDiscrepancy
                ? "border-red-500 bg-red-50"
                : "border-green-500/40 bg-green-50/40"
            }
            valueClassName={
              hasDiscrepancy
                ? "font-semibold text-red-600"
                : "font-medium text-green-600"
            }
          />
        </div>
        {hasDiscrepancy && (
          <p className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {formatCurrency(discrepancy)} tiền chưa được đối soát sau các khoản chi.
            Vui lòng đối chiếu lại số liệu hoặc ghi rõ lý do bên dưới trước khi phê duyệt.
          </p>
        )}
      </section>

      {/* Editable: accounting notes (AI proposal, human-correctable) */}
      <section className="space-y-2">
        <Label htmlFor="accountingNotes">
          Ghi chú Kế toán
        </Label>
        <textarea
          id="accountingNotes"
          rows={4}
          value={form.accountingNotes}
          onChange={(e) => set("accountingNotes")(e.target.value)}
          placeholder="Giải thích khoản chênh lệch (vd: chi tiền mặt mua hàng, trích trả tip cho nhân viên)…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </section>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy !== null}>
          {canWrite ? "Hủy" : "Đóng"}
        </Button>
        {canWrite && (
          <>
            <Button
              variant="secondary"
              onClick={() => run("save", onSave)}
              disabled={busy !== null}
            >
              {busy === "save" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu thay đổi
            </Button>
            <Button
              onClick={() => run("approve", onApprove)}
              disabled={busy !== null || isApproved}
            >
              {busy === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {isApproved ? "Đã phê duyệt" : "Phê duyệt"}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}

export function RevenueReviewDialog({
  report,
  open,
  onOpenChange,
  onSave,
  onApprove,
}: RevenueReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {report && (
          <ReviewForm
            key={report.id}
            report={report}
            onSave={onSave}
            onApprove={onApprove}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
