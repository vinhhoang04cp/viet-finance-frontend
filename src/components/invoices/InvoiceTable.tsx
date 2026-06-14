"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/types/invoice";

interface InvoiceTableProps {
  invoices: Invoice[];
  /** Fired when the accountant clicks a row to open the review dialog. */
  onSelect: (invoice: Invoice) => void;
}

/**
 * Smart, responsive invoice queue.
 *
 * THE RED FLAG RULE: every row where `requiresManualReview === true` is tinted
 * amber and marked with an AlertTriangle next to the vendor name so an
 * accountant can triage the queue at a glance. Clean rows keep the default
 * background. The whole row is clickable (and keyboard-accessible) to open the
 * review dialog.
 */
export function InvoiceTable({ invoices, onSelect }: InvoiceTableProps) {
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
          </TableRow>
        </TableHeader>

        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-24 text-center text-muted-foreground"
              >
                No invoices to display.
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => {
              const flagged = invoice.requiresManualReview;

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
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
