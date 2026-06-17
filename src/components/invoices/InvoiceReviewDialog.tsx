"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Save } from "lucide-react";

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
import { LabeledInput } from "@/components/forms/LabeledInput";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";
import type { EditableInvoiceFields, Invoice } from "@/types/invoice";

interface InvoiceReviewDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persist field corrections (PATCH). */
  onSave: (id: number, changes: EditableInvoiceFields) => Promise<void>;
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Human-readable labels for the server-owned review reason codes (Invoice.reviewReasons()).
 * Tells the reviewer WHICH field to fix instead of a bare "needs review" badge. English to match
 * the (still-English) invoice surface. Unknown codes fall back to the raw code.
 */
const REVIEW_REASON_LABELS: Record<string, string> = {
  MATH_UNBALANCED: "Amounts don't balance: Net + Tax 7% + Tax 19% ≠ Gross.",
  TAX19_BUCKET_IMPLAUSIBLE:
    "The 19% tax implies a taxable base larger than Net — a 7% amount may be in the 19% box.",
  INVOICE_NUMBER_MISSING: "Invoice number is missing.",
  INVOICE_NUMBER_SUSPICIOUS:
    "Invoice number looks invalid (UNKNOWN or a phone number) — enter the real Rechnungsnummer.",
  INVOICE_NUMBER_DECOY:
    "Invoice number matches a known decoy ID (e.g. a GLN / Kunden-Nr.), not a real Rechnungsnummer — enter the correct one.",
};

/** Parse a numeric string -> number | null (blank becomes null). */
function num(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

/**
 * Editable form for one invoice. State is initialised from props; the parent
 * mounts this with `key={invoice.id}` so a different invoice gets fresh state
 * (no `useEffect` sync).
 *
 * The figures driving the server-owned `requiresManualReview` flag are editable so
 * saving corrected values lets the backend re-validate and clear it. The accounting
 * check reconciles `gross == net + tax7 + tax19` (the 7%/19% buckets, NOT the
 * "Tax total" — which is a derived display field, shown read-only here). The backend
 * has no invoice approval workflow (KISS), so "Save changes" is the only action.
 */
function ReviewForm({
  invoice,
  onSave,
  onClose,
}: {
  invoice: Invoice;
  onSave: (id: number, changes: EditableInvoiceFields) => Promise<void>;
  onClose: () => void;
}) {
  const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const [form, setForm] = React.useState<Record<string, string>>({
    vendorName: str(invoice.vendorName),
    invoiceNumber: invoice.invoiceNumber === "UNKNOWN" ? "" : str(invoice.invoiceNumber),
    netAmount: str(invoice.netAmount),
    grossAmount: str(invoice.grossAmount),
    taxAmount7: str(invoice.taxAmount7),
    taxAmount19: str(invoice.taxAmount19),
    taxRates: str(invoice.taxRates),
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { canWrite } = useAuth();

  const set = (key: string) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // "Tax total" is derived, not edited: it must equal tax7 + tax19, which is exactly what
  // the backend's math check (gross == net + tax7 + tax19) reconciles. Showing it live and
  // read-only stops a reviewer from "fixing" the total and wondering why the flag stays.
  const taxTotal = (num(form.taxAmount7) ?? 0) + (num(form.taxAmount19) ?? 0);

  function collect(): EditableInvoiceFields {
    const changes: EditableInvoiceFields = {};
    if (form.vendorName.trim()) changes.vendorName = form.vendorName.trim();
    // Always send the invoice number so a blank field falls back to "UNKNOWN"
    // (the backend's sentinel) rather than being silently dropped.
    changes.invoiceNumber = form.invoiceNumber.trim() || "UNKNOWN";
    if (form.taxRates.trim()) changes.taxRates = form.taxRates.trim();
    // taxAmount is intentionally NOT sent: it is a derived total (tax7 + tax19) that the
    // backend recomputes on save. The reviewer edits the per-rate buckets, not the total.
    const numericKeys = ["netAmount", "grossAmount", "taxAmount7", "taxAmount19"] as const;
    for (const k of numericKeys) {
      const n = num(form[k]);
      if (n !== null) changes[k] = n;
    }
    return changes;
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await onSave(invoice.id, collect());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <DialogTitle>{invoice.vendorName ?? "Unknown vendor"}</DialogTitle>
          {invoice.requiresManualReview && (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3" />
              Needs review
            </Badge>
          )}
        </div>
        <DialogDescription>
          Invoice #{invoice.id} &middot; issued {formatDate(invoice.invoiceDate)}
        </DialogDescription>
      </DialogHeader>

      {/* Why this invoice is flagged — tells the reviewer which field to fix. */}
      {invoice.requiresManualReview && (invoice.reviewReasons?.length ?? 0) > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Why this needs review
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-800">
            {invoice.reviewReasons!.map((code) => (
              <li key={code}>{REVIEW_REASON_LABELS[code] ?? code}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Read-only context */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ReadOnlyField label="Tax rates" value={invoice.taxRates ?? "—"} />
        <ReadOnlyField label="Invoice date" value={formatDate(invoice.invoiceDate)} />
        <ReadOnlyField
          label="Tax total"
          value={typeof invoice.taxAmount === "number" ? invoice.taxAmount : "—"}
        />
      </div>

      {/* Editable: figures driving the manual-review flag */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Verify &amp; correct (EUR)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <LabeledInput id="vendorName" label="Vendor" value={form.vendorName} onChange={set("vendorName")} className="col-span-2 sm:col-span-3" />
          <LabeledInput id="invoiceNumber" label="Invoice no." mono value={form.invoiceNumber} onChange={set("invoiceNumber")} placeholder="e.g. RE-2026-000123" className="col-span-2 sm:col-span-3" />
          <LabeledInput id="netAmount" label="Net" type="number" step="0.01" value={form.netAmount} onChange={set("netAmount")} />
          <LabeledInput id="taxTotal" label="Tax total" type="number" value={taxTotal.toFixed(2)} onChange={() => {}} disabled hint="= Tax 7% + Tax 19% (auto)" />
          <LabeledInput id="grossAmount" label="Gross" type="number" step="0.01" value={form.grossAmount} onChange={set("grossAmount")} />
          <LabeledInput id="taxAmount7" label="Tax 7%" type="number" step="0.01" value={form.taxAmount7} onChange={set("taxAmount7")} hint="Drives the review flag" />
          <LabeledInput id="taxAmount19" label="Tax 19%" type="number" step="0.01" value={form.taxAmount19} onChange={set("taxAmount19")} hint="Drives the review flag" />
          <LabeledInput id="taxRates" label="Tax rates" value={form.taxRates} onChange={set("taxRates")} placeholder="e.g. 7%, 19%" />
        </div>
      </section>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {canWrite ? "Hủy" : "Đóng"}
        </Button>
        {canWrite && (
          <Button onClick={handleSave} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Lưu thay đổi
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

/**
 * Detail / correction view for a single invoice. The financial figures and the
 * invoice number are editable; the dashboard handles persistence. The backend
 * re-runs its math validation on save and recomputes `requiresManualReview`.
 */
export function InvoiceReviewDialog({
  invoice,
  open,
  onOpenChange,
  onSave,
}: InvoiceReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {invoice && (
          <ReviewForm
            key={invoice.id}
            invoice={invoice}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
