"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

/** One cell of the summary bar: a label on top, a large value beneath. */
export interface TaxSummaryItem {
  /** Display label (caller-supplied, so each page keeps its own language). */
  label: string;
  /** Pre-formatted value (e.g. `formatCurrency(...)` or a count). */
  value: React.ReactNode;
  /** Tints the value to signal an exception (e.g. a non-zero discrepancy). */
  tone?: "default" | "danger";
}

interface TaxSummaryBarProps {
  items: TaxSummaryItem[];
  loading?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * Horizontal tax summary bar shown above a list table.
 *
 * Generic by design: the parent passes an array of {label, value} cells, so the
 * same component serves the invoice list (4 cells), the revenue list (5 cells)
 * and the dashboard. Cells lay out in a responsive grid — two columns on mobile,
 * one column per item from `sm` up. Skeletons render while `loading`; an inline
 * banner renders on `error`.
 */
export function TaxSummaryBar({
  items,
  loading = false,
  error = null,
  className,
}: TaxSummaryBarProps) {
  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-700",
          className
        )}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm sm:flex sm:divide-y-0 sm:divide-x",
        className
      )}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-1 flex-col gap-1 px-4 py-3",
            // On mobile the 2-col grid needs a left border on the right cell of each row.
            i % 2 === 1 && "border-l sm:border-l-0"
          )}
        >
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {item.label}
          </span>
          {loading ? (
            <span className="h-7 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <span
              className={cn(
                "text-xl font-bold tabular-nums sm:text-2xl",
                item.tone === "danger" && "text-red-700"
              )}
            >
              {item.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
