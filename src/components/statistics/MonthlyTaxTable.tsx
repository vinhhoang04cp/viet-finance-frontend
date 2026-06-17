"use client";

import * as React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import { sumTimeline, timelineLong } from "@/lib/statistics";
import type { TimelinePoint } from "@/types/statistics";

interface MonthlyTaxTableProps {
  /** Continuous timeline points (ascending; may span year boundaries). */
  data: TimelinePoint[];
  /** Called when a month row is clicked — opens the drill-down for that month. */
  onSelectMonth?: (point: TimelinePoint) => void;
}

/**
 * Per-month breakdown table (Phần 4 of the dashboard) over the rolling timeline window. One row per
 * month (label "Tháng M/YYYY") plus a bold window-total row. Rows are clickable for the drill-down.
 * Numbers are right-aligned with tabular-nums.
 */
export function MonthlyTaxTable({ data, onSelectMonth }: MonthlyTaxTableProps) {
  const total = sumTimeline(data);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Tháng</TableHead>
            <TableHead className="text-right">Thuế 7%</TableHead>
            <TableHead className="text-right">Thuế 19%</TableHead>
            <TableHead className="text-right">Tổng thuế</TableHead>
            <TableHead className="text-right">Doanh thu thuần</TableHead>
            <TableHead className="text-right">Tổng doanh thu</TableHead>
            <TableHead className="text-right">Số bản ghi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => (
            <TableRow
              key={`${p.year}-${p.month}`}
              onClick={onSelectMonth ? () => onSelectMonth(p) : undefined}
              className={cn(onSelectMonth && "cursor-pointer")}
            >
              <TableCell className="font-medium">{timelineLong(p)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(p.totalTax7)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(p.totalTax19)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(p.totalTax)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(p.totalNetRevenue)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(p.totalGrossRevenue)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{p.reportCount}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 bg-muted/30 font-semibold hover:bg-muted/30">
            <TableCell>Tổng cộng</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(total.totalTax7)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(total.totalTax19)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(total.totalTax)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(total.totalNetRevenue)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(total.totalGrossRevenue)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{total.reportCount}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
