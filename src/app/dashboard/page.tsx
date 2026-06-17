"use client";

import * as React from "react";
import {
  AlertTriangle,
  BarChart3,
  Coins,
  Percent,
  RefreshCw,
  Sigma,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/statistics/StatCard";
import { MonthlyTaxBarChart } from "@/components/statistics/MonthlyTaxBarChart";
import { TaxDistributionPieChart } from "@/components/statistics/TaxDistributionPieChart";
import { MonthlyTaxTable } from "@/components/statistics/MonthlyTaxTable";
import {
  InvoiceLineItemsTable,
  RevenueLineItemsTable,
} from "@/components/statistics/LineItemsTables";
import {
  fetchInvoiceTimeline,
  fetchInvoiceDetails,
} from "@/lib/api";
import {
  fetchRevenueTimeline,
  fetchRevenueDetails,
} from "@/lib/revenueApi";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DEFAULT_TIMELINE_MONTHS,
  TIMELINE_RANGES,
  mergeTimeline,
  monthRangeOf,
  recentRange,
  sumTimeline,
  timelineLong,
} from "@/lib/statistics";
import type { DocumentStatus } from "@/types/common";
import type {
  InvoiceLineItem,
  RevenueLineItem,
  TimelinePoint,
} from "@/types/statistics";

type ModuleFilter = "all" | "invoice" | "revenue";
type StatusFilter = "all" | DocumentStatus;

const MODULE_OPTIONS: { value: ModuleFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "invoice", label: "Hóa đơn" },
  { value: "revenue", label: "Doanh thu" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
];

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function StatisticsDashboardPage() {
  const [module, setModule] = React.useState<ModuleFilter>("all");
  const [months, setMonths] = React.useState<number>(DEFAULT_TIMELINE_MONTHS);
  const [status, setStatus] = React.useState<StatusFilter>("all");

  const [timeline, setTimeline] = React.useState<TimelinePoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  // Selected month for the drill-down (null = closed).
  const [selected, setSelected] = React.useState<TimelinePoint | null>(null);
  const [invoiceItems, setInvoiceItems] = React.useState<InvoiceLineItem[]>([]);
  const [revenueItems, setRevenueItems] = React.useState<RevenueLineItem[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const range = React.useMemo(() => recentRange(months), [months]);

  // ── Timeline (rolling window) ──────────────────────────────────────────────
  React.useEffect(() => {
    const controller = new AbortController();
    const statusParam = status === "all" ? undefined : status;

    const load = async (): Promise<TimelinePoint[]> => {
      if (module === "invoice") {
        return (await fetchInvoiceTimeline(range.from, range.to, controller.signal)).points;
      }
      if (module === "revenue") {
        return (await fetchRevenueTimeline(range.from, range.to, statusParam, controller.signal))
          .points;
      }
      const [inv, rev] = await Promise.all([
        fetchInvoiceTimeline(range.from, range.to, controller.signal),
        fetchRevenueTimeline(range.from, range.to, statusParam, controller.signal),
      ]);
      return mergeTimeline(inv.points, rev.points);
    };

    load()
      .then((data) => {
        setTimeline(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Không thể tải dữ liệu thống kê.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [module, range.from, range.to, status, reloadToken]);

  // ── Drill-down details for the selected month ──────────────────────────────
  React.useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const statusParam = status === "all" ? undefined : status;
    const { from, to } = monthRangeOf(selected);

    const load = async () => {
      const [inv, rev] = await Promise.all([
        module === "revenue"
          ? Promise.resolve<InvoiceLineItem[]>([])
          : fetchInvoiceDetails(from, to, controller.signal),
        module === "invoice"
          ? Promise.resolve<RevenueLineItem[]>([])
          : fetchRevenueDetails(from, to, statusParam, controller.signal),
      ]);
      return { inv, rev };
    };

    load()
      .then(({ inv, rev }) => {
        setInvoiceItems(inv);
        setRevenueItems(rev);
        setDetailError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setDetailError(err instanceof Error ? err.message : "Không thể tải chi tiết tháng.");
        }
      })
      .finally(() => setDetailLoading(false));

    return () => controller.abort();
  }, [selected, module, status]);

  const totals = React.useMemo(() => sumTimeline(timeline), [timeline]);

  function openMonth(point: TimelinePoint) {
    setDetailLoading(true);
    setDetailError(null);
    setInvoiceItems([]);
    setRevenueItems([]);
    setSelected(point);
  }
  function changeModule(next: ModuleFilter) {
    setLoading(true);
    setSelected(null);
    setModule(next);
  }
  function changeMonths(next: number) {
    setLoading(true);
    setSelected(null);
    setMonths(next);
  }
  function changeStatus(next: StatusFilter) {
    setLoading(true);
    setSelected(null);
    setStatus(next);
  }
  function handleRefresh() {
    setLoading(true);
    setSelected(null);
    setReloadToken((t) => t + 1);
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Thống kê thuế</h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi tiền thuế theo tháng cho hóa đơn và doanh thu — bấm vào một tháng để xem chi tiết.
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Làm mới
          </Button>
        </header>

        {/* Phần 1 — Bộ lọc */}
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Mô-đun:</span>
              <div className="flex gap-1">
                {MODULE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={module === opt.value ? "default" : "outline"}
                    onClick={() => changeModule(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Khoảng:</span>
              <select
                className={SELECT_CLASS}
                value={String(months)}
                onChange={(e) => changeMonths(Number(e.target.value))}
                aria-label="Khoảng thời gian"
              >
                {TIMELINE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {module !== "invoice" && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Trạng thái:</span>
                <select
                  className={SELECT_CLASS}
                  value={status}
                  onChange={(e) => changeStatus(e.target.value as StatusFilter)}
                  aria-label="Trạng thái"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={handleRefresh}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Phần 2 — Stat cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Tổng thuế 7%"
            value={formatCurrency(totals.totalTax7)}
            icon={<Percent className="h-5 w-5" />}
            loading={loading}
          />
          <StatCard
            title="Tổng thuế 19%"
            value={formatCurrency(totals.totalTax19)}
            icon={<Percent className="h-5 w-5" />}
            loading={loading}
          />
          <StatCard
            title="Tổng thuế"
            value={formatCurrency(totals.totalTax)}
            icon={<Coins className="h-5 w-5" />}
            loading={loading}
            accent="primary"
          />
          <StatCard
            title="Tổng doanh thu"
            value={formatCurrency(totals.totalGrossRevenue)}
            icon={<Sigma className="h-5 w-5" />}
            loading={loading}
          />
        </section>

        {/* Phần 3 — Biểu đồ */}
        <section className="mb-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Thuế theo tháng — {TIMELINE_RANGES.find((r) => r.value === months)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 w-full animate-pulse rounded-lg bg-muted" />
              ) : (
                <MonthlyTaxBarChart data={timeline} onSelectMonth={openMonth} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phân bổ thuế 7% / 19%</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 w-full animate-pulse rounded-lg bg-muted" />
              ) : (
                <TaxDistributionPieChart tax7={totals.totalTax7} tax19={totals.totalTax19} />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Phần 4 — Drill-down chi tiết tháng */}
        {selected && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Chi tiết {timelineLong(selected)}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
                Đóng
              </Button>
            </div>

            {detailError ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{detailError}</span>
              </div>
            ) : detailLoading ? (
              <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />
            ) : (
              <div className="space-y-6">
                {module !== "revenue" && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      Hóa đơn (thuế đầu vào) · {invoiceItems.length}
                    </h3>
                    <InvoiceLineItemsTable items={invoiceItems} />
                  </div>
                )}
                {module !== "invoice" && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      Doanh thu (thuế đầu ra) · {revenueItems.length}
                    </h3>
                    <RevenueLineItemsTable items={revenueItems} />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Phần 5 — Bảng chi tiết theo tháng */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Chi tiết theo tháng</h2>
          {loading ? (
            <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />
          ) : (
            <MonthlyTaxTable data={timeline} onSelectMonth={openMonth} />
          )}
        </section>
      </div>
    </main>
  );
}
