"use client";

import { AlertTriangle, Check, CheckCircle2, Loader2, X } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { DocumentStatus } from "@/types/common";
import type { Invoice } from "@/types/invoice";

interface InvoiceTableProps {
  invoices: Invoice[];
  /** Fired when the accountant clicks a row to open the review dialog. */
  onSelect: (invoice: Invoice) => void;
  /** Approve / reject an invoice (Approval Station). Omit to hide the action buttons. */
  onUpdateStatus?: (invoice: Invoice, status: DocumentStatus) => void;
  /** Id of the invoice whose status change is in flight (shows a spinner, disables its buttons). */
  pendingStatusId?: number | null;
}

/**
 * Smart, responsive invoice queue.
 *
 * THE RED FLAG RULE: every row where `requiresManualReview === true` is tinted
 * amber and marked with an AlertTriangle next to the vendor name so an
 * accountant can triage the queue at a glance. The "Review" column reflects that
 * system-computed flag and is SEPARATE from the human-driven approval "Status".
 *
 * Approval Station: the Status column shows the current `DocumentStatus`; the
 * Actions column has Approve / Reject buttons (their click is stopped from
 * bubbling so it doesn't also open the review dialog). Approve is disabled while
 * the row needs review — the backend would reject it with 409 anyway.
 */
export function InvoiceTable({
  invoices,
  onSelect,
  onUpdateStatus,
  pendingStatusId,
}: InvoiceTableProps) {
  const showActions = Boolean(onUpdateStatus);
  const colCount = showActions ? 10 : 9;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[64px]">ID</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Invoice No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-center">Review</TableHead>
            <TableHead className="text-center">Status</TableHead>
            {showActions && <TableHead className="text-center">Actions</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colCount}
                className="h-24 text-center text-muted-foreground"
              >
                No invoices to display.
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => {
              const flagged = invoice.requiresManualReview;
              const pending = pendingStatusId === invoice.id;

              return (
                <TableRow
                  key={invoice.id}
                  onClick={() => onSelect(invoice)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Review invoice ${invoice.invoiceNumber} from ${
                    invoice.vendorName ?? "unknown vendor"
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(invoice);
                    }
                  }}
                  className={cn(
                    "cursor-pointer",
                    // RED FLAG RULE: visually elevate rows needing review.
                    flagged &&
                      "bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/20"
                  )}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {invoice.id}
                  </TableCell>

                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {flagged && (
                        <AlertTriangle
                          className="h-4 w-4 shrink-0 text-red-600"
                          aria-label="Requires manual review"
                        />
                      )}
                      <span className="truncate">
                        {invoice.vendorName ?? "Unknown vendor"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell
                    className={cn(
                      "font-mono text-sm",
                      invoice.invoiceNumber === "UNKNOWN" &&
                        "italic text-red-600"
                    )}
                  >
                    {invoice.invoiceNumber}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(invoice.invoiceDate)}
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(invoice.netAmount)}
                  </TableCell>

                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(invoice.taxAmount)}
                  </TableCell>

                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(invoice.grossAmount)}
                  </TableCell>

                  <TableCell className="text-center">
                    {flagged ? (
                      <Badge variant="warning">
                        <AlertTriangle className="h-3 w-3" />
                        Needs review
                      </Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        OK
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <StatusBadge status={invoice.status} />
                  </TableCell>

                  {showActions && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {pending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 border-emerald-200 px-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              disabled={flagged || invoice.status === "APPROVED"}
                              title={
                                flagged
                                  ? "Fix the figures first — an invoice that needs review cannot be approved"
                                  : "Approve"
                              }
                              aria-label={`Approve invoice ${invoice.invoiceNumber}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus?.(invoice, "APPROVED");
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 border-red-200 px-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                              disabled={invoice.status === "REJECTED"}
                              title="Reject"
                              aria-label={`Reject invoice ${invoice.invoiceNumber}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus?.(invoice, "REJECTED");
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
