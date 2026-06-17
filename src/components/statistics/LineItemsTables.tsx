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
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceLineItem, RevenueLineItem } from "@/types/statistics";

/** Empty-state row spanning the whole table. */
function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

/** Drill-down table of invoices (input tax / Vorsteuer) for the selected month. */
export function InvoiceLineItemsTable({ items }: { items: InvoiceLineItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Ngày hóa đơn</TableHead>
            <TableHead>Số hóa đơn</TableHead>
            <TableHead>Tên nhà cung cấp</TableHead>
            <TableHead className="text-right">Tiền chưa thuế</TableHead>
            <TableHead className="text-right">Thuế 7%</TableHead>
            <TableHead className="text-right">Thuế 19%</TableHead>
            <TableHead className="text-right">Tổng tiền</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <EmptyRow colSpan={7} label="Không có hóa đơn trong tháng này." />
          ) : (
            items.map((it) => (
              <TableRow key={it.invoiceId}>
                <TableCell>{formatDate(it.invoiceDate)}</TableCell>
                <TableCell className="font-medium">{it.invoiceNumber ?? "—"}</TableCell>
                <TableCell>{it.vendorName ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(it.netAmount)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(it.taxAmount7)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(it.taxAmount19)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(it.grossAmount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/** Drill-down table of revenue reports (output tax / Umsatzsteuer) for the selected month. */
export function RevenueLineItemsTable({ items }: { items: RevenueLineItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Ngày báo cáo</TableHead>
            <TableHead>Mã báo cáo</TableHead>
            <TableHead>Chi nhánh</TableHead>
            <TableHead>POS</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Doanh thu thuần</TableHead>
            <TableHead className="text-right">Thuế 7%</TableHead>
            <TableHead className="text-right">Thuế 19%</TableHead>
            <TableHead className="text-right">Tổng doanh thu</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <EmptyRow colSpan={9} label="Không có báo cáo doanh thu trong tháng này." />
          ) : (
            items.map((it) => (
              <TableRow key={it.reportId}>
                <TableCell>{formatDate(it.reportDate)}</TableCell>
                <TableCell className="font-medium">{it.reportNumber ?? "—"}</TableCell>
                <TableCell>{it.branchName ?? "—"}</TableCell>
                <TableCell>{it.posSystemName ?? "—"}</TableCell>
                <TableCell>
                  {it.status ? <StatusBadge status={it.status} /> : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(it.netRevenue)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(it.taxAmount7)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(it.taxAmount19)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(it.grossRevenue)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
