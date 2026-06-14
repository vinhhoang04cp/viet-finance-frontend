"use client";

import * as React from "react";
import {
  AlertTriangle,
  BarChart3,
  Coins,
  Percent,
  RefreshCw,
  Sigma,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/statistics/StatCard";
import { MonthlyTaxBarChart } from "@/components/statistics/MonthlyTaxBarChart";
import { TaxDistributionPieChart } from "@/components/statistics/TaxDistributionPieChart";
import { MonthlyTaxTable } from "@/components/statistics/MonthlyTaxTable";
import { fetchInvoiceMonthlyStatistics } from "@/lib/api";
import { fetchRevenueMonthlyStatistics } from "@/lib/revenueApi";
import { cn, formatCurrency } from "@/lib/utils";
import { availableYears } from "@/lib/period";
import { emptyMonthly, mergeMonthly, sumMonthly } from "@/lib/statistics";
import type { DocumentStatus } from "@/types/common";
import type { MonthlyTaxPoint } from "@/types/statistics";

type ModuleFilter = "all" | "invoice" | "revenue";
type StatusFilter = "all" | DocumentStatus;
type YearFilter = number | "all";

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
  const years = React.useMemo(() => availableYears(), []);

  const [module, setModule] = React.useState<ModuleFilter>("all");
  const [year, setYear] = React.useState<YearFilter>(years[0]);
  const [status, setStatus] = React.useState<StatusFilter>("all");

  const [monthly, setMonthly] = React.useState<MonthlyTaxPoint[]>(emptyMonthly());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  // Fetch the monthly series for the current module/year/status. State is only set
  // in the async callbacks; "loading" resets live in the change handlers so the
  // effect body stays free of synchronous setState (react-hooks/set-state-in-effect).
  React.useEffect(() => {
    const controller = new AbortController();
    const statusParam = status === "all" ? undefined : status;
    const yearParam = year === "all" ? null : year;

    const load = async (): Promise<MonthlyTaxPoint[]> => {
      if (module === "invoice") {
        return (await fetchInvoiceMonthlyStatistics(yearParam, controller.signal)).monthly;
      }
      if (module === "revenue") {
        return (
          await fetchRevenueMonthlyStatistics(yearParam, statusParam, controller.signal)
        ).monthly;
      }
      const [inv, rev] = await Promise.all([
        fetchInvoiceMonthlyStatistics(yearParam, controller.signal),
        fetchRevenueMonthlyStatistics(yearParam, statusParam, controller.signal),
      ]);
      return mergeMonthly(inv.monthly, rev.monthly);
    };

    load()
      .then((data) => {
        setMonthly(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setError(
            err instanceof Error ? err.message : "Không thể tải dữ liệu thống kê."
          );
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [module, year, status, reloadToken]);

  const totals = React.useMemo(() => sumMonthly(monthly), [monthly]);

  function changeModule(next: ModuleFilter) {
    setLoading(true);
    setModule(next);
  }
  function changeYear(next: YearFilter) {
    setLoading(true);
    setYear(next);
  }
  function changeStatus(next: StatusFilter) {
    setLoading(true);
    setStatus(next);
  }
  function handleRefresh() {
    setLoading(true);
    setReloadToken((t) => t + 1);
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Thống kê thuế</h1>
            <p className="text-sm text-muted-foreground">
              Tổng quan tiền thuế theo tháng cho hóa đơn và doanh thu.
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
              <span className="text-sm font-medium text-muted-foreground">Năm:</span>
              <select
                className={SELECT_CLASS}
                value={year === "all" ? "all" : String(year)}
                onChange={(e) =>
                  changeYear(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                aria-label="Năm"
              >
                <option value="all">Tất cả các năm</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {module !== "invoice" && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Trạng thái:
                </span>
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
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={handleRefresh}
            >
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
                Thuế theo tháng — {year === "all" ? "tất cả các năm" : year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 w-full animate-pulse rounded-lg bg-muted" />
              ) : (
                <MonthlyTaxBarChart data={monthly} />
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
                <TaxDistributionPieChart
                  tax7={totals.totalTax7}
                  tax19={totals.totalTax19}
                />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Phần 4 — Bảng chi tiết theo tháng */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Chi tiết theo tháng
          </h2>
          {loading ? (
            <div className="h-96 w-full animate-pulse rounded-xl bg-muted" />
          ) : (
            <MonthlyTaxTable data={monthly} />
          )}
        </section>
      </div>
    </main>
  );
}
