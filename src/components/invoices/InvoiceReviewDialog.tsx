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
 * Every amount is editable because the server-owned `requiresManualReview` flag
 * is driven by the accounting math check — saving corrected figures lets the
 * backend re-validate and clear the flag. The backend has no invoice approval
 * workflow (KISS), so "Save changes" is the only action.
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
    taxAmount: str(invoice.taxAmount),
    taxAmount7: str(invoice.taxAmount7),
    taxAmount19: str(invoice.taxAmount19),
    taxRates: str(invoice.taxRates),
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = (key: string) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function collect(): EditableInvoiceFields {
    const changes: EditableInvoiceFields = {};
    if (form.vendorName.trim()) changes.vendorName = form.vendorName.trim();
    // Always send the invoice number so a blank field falls back to "UNKNOWN"
    // (the backend's sentinel) rather than being silently dropped.
    changes.invoiceNumber = form.invoiceNumber.trim() || "UNKNOWN";
    if (form.taxRates.trim()) changes.taxRates = form.taxRates.trim();
    const numericKeys = [
      "netAmount",
      "grossAmount",
      "taxAmount",
      "taxAmount7",
      "taxAmount19",
    ] as const;
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
          <LabeledInput id="taxAmount" label="Tax total" type="number" step="0.01" value={form.taxAmount} onChange={set("taxAmount")} />
          <LabeledInput id="grossAmount" label="Gross" type="number" step="0.01" value={form.grossAmount} onChange={set("grossAmount")} />
          <LabeledInput id="taxAmount7" label="Tax 7%" type="number" step="0.01" value={form.taxAmount7} onChange={set("taxAmount7")} />
          <LabeledInput id="taxAmount19" label="Tax 19%" type="number" step="0.01" value={form.taxAmount19} onChange={set("taxAmount19")} />
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
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save changes
        </Button>
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
