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
import { formatCurrency } from "@/lib/utils";
import { MONTH_LONG_VI, sumMonthly } from "@/lib/statistics";
import type { MonthlyTaxPoint } from "@/types/statistics";

interface MonthlyTaxTableProps {
  data: MonthlyTaxPoint[];
}

/**
 * Per-month breakdown table (Phần 4 of the dashboard). 12 month rows plus a bold
 * year-total row. Numbers are right-aligned with tabular-nums.
 */
export function MonthlyTaxTable({ data }: MonthlyTaxTableProps) {
  const total = sumMonthly(data);

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
            <TableRow key={p.month}>
              <TableCell className="font-medium">{MONTH_LONG_VI[p.month - 1]}</TableCell>
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
            <TableCell>Cả năm</TableCell>
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
