"use client";

import { AlertTriangle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { RevenueReport } from "@/types/revenue";

interface RevenueTableProps {
  reports: RevenueReport[];
  onSelect: (report: RevenueReport) => void;
}

/**
 * Revenue report queue. Same RED FLAG RULE as the invoice table: rows where
 * `requiresManualReview === true` are amber-tinted with a red AlertTriangle so
 * the accountant can triage broken-math reports at a glance.
 */
export function RevenueTable({ reports, onSelect }: RevenueTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[64px]">ID</TableHead>
            <TableHead>Chi nhánh</TableHead>
            <TableHead>Mã báo cáo</TableHead>
            <TableHead>POS</TableHead>
            <TableHead>Ngày</TableHead>
            <TableHead className="text-right">Doanh thu thuần</TableHead>
            <TableHead className="text-right">Thuế</TableHead>
            <TableHead className="text-right">Tổng doanh thu</TableHead>
            <TableHead className="text-center">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {reports.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="h-24 text-center text-muted-foreground"
              >
                Chưa có báo cáo doanh thu. Dùng “Quét báo cáo” để thêm.
              </TableCell>
            </TableRow>
          ) : (
            reports.map((r) => {
              const flagged = r.requiresManualReview;
              return (
                <TableRow
                  key={r.id}
                  onClick={() => onSelect(r)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Kiểm tra báo cáo doanh thu ${r.reportNumber ?? r.id}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(r);
                    }
                  }}
                  className={cn(
                    "cursor-pointer",
                    flagged &&
                      "bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/20"
                  )}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {flagged && (
                        <AlertTriangle
                          className="h-4 w-4 shrink-0 text-red-600"
                          aria-label="Cần kiểm tra thủ công"
                        />
                      )}
                      <span className="truncate">
                        {r.storeName ?? "Chi nhánh không xác định"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {r.reportNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.posSystemName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(r.reportDate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(r.netRevenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(r.taxAmount)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(r.grossRevenue)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={r.status} />
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
