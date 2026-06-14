"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ScanLine,
  Sigma,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RevenueTable } from "@/components/revenues/RevenueTable";
import { RevenueReviewDialog } from "@/components/revenues/RevenueReviewDialog";
import { TaxSummaryBar } from "@/components/statistics/TaxSummaryBar";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import {
  fetchRevenues,
  fetchRevenueStatistics,
  updateRevenue,
  updateRevenueStatus,
} from "@/lib/revenueApi";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ALL_PERIOD,
  isDateInPeriod,
  periodToRange,
  type Period,
} from "@/lib/period";
import type {
  EditableRevenueFields,
  RevenueReport,
  RevenueTaxStatistics,
} from "@/types/revenue";

function SummaryCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent?: "danger";
}) {
  return (
    <Card className={cn(accent === "danger" && "border-red-200 bg-red-50/50")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span
          className={cn(
            "text-muted-foreground",
            accent === "danger" && "text-red-600"
          )}
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-3xl font-bold tabular-nums",
            accent === "danger" && "text-red-700"
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RevenueDashboardPage() {
  const [reports, setReports] = React.useState<RevenueReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [period, setPeriod] = React.useState<Period>(ALL_PERIOD);
  const [stats, setStats] = React.useState<RevenueTaxStatistics | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  const [reloadToken, setReloadToken] = React.useState(0);

  const [selected, setSelected] = React.useState<RevenueReport | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const range = React.useMemo(() => periodToRange(period), [period]);
  const { from, to } = range;

  // Fetch the revenue list (re-runs on manual refresh). State is only set inside
  // the async callbacks; the "loading" reset lives in the refresh handler so the
  // effect body stays free of synchronous setState (react-hooks/set-state-in-effect).
  React.useEffect(() => {
    const controller = new AbortController();
    fetchRevenues(controller.signal)
      .then((data) => {
        setReports(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setError(
            err instanceof Error ? err.message : "Đã xảy ra lỗi không mong muốn."
          );
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reloadToken]);

  // Fetch the server-aggregated tax statistics for the selected period.
  React.useEffect(() => {
    const controller = new AbortController();
    fetchRevenueStatistics(from, to, undefined, controller.signal)
      .then((data) => {
        setStats(data);
        setStatsError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setStatsError(
            err instanceof Error ? err.message : "Không thể tải thống kê."
          );
        }
      })
      .finally(() => setStatsLoading(false));
    return () => controller.abort();
  }, [from, to, reloadToken]);

  // Show skeletons immediately when the period changes, before the fetch resolves.
  function handlePeriodChange(next: Period) {
    setStatsLoading(true);
    setPeriod(next);
  }

  function handleRefresh() {
    setLoading(true);
    setStatsLoading(true);
    setReloadToken((t) => t + 1);
  }

  // The table + KPI cards reflect the same window as the summary bar. A report's
  // period date is its start date (aggregate) falling back to the print date.
  const visibleReports = React.useMemo(
    () =>
      reports.filter((r) =>
        isDateInPeriod(r.reportStartDate ?? r.reportDate, range)
      ),
    [reports, range]
  );

  const { reviewCount, totalGross } = React.useMemo(
    () => ({
      reviewCount: visibleReports.filter((r) => r.requiresManualReview).length,
      totalGross: visibleReports.reduce(
        (sum, r) => sum + (r.grossRevenue ?? 0),
        0
      ),
    }),
    [visibleReports]
  );

  function handleSelect(report: RevenueReport) {
    setSelected(report);
    setDialogOpen(true);
  }

  // Save field corrections (PATCH). Throws on failure so the dialog surfaces it.
  async function handleSave(id: number, changes: EditableRevenueFields) {
    const saved = await updateRevenue(id, changes);
    setReports((prev) => prev.map((r) => (r.id === id ? saved : r)));
  }

  // Save corrections, then transition to APPROVED. The backend rejects approval
  // (409) when the dual math check fails; that error propagates to the dialog.
  async function handleApprove(id: number, changes: EditableRevenueFields) {
    const saved = await updateRevenue(id, changes);
    setReports((prev) => prev.map((r) => (r.id === id ? saved : r)));
    const approved = await updateRevenueStatus(id, "APPROVED");
    setReports((prev) => prev.map((r) => (r.id === id ? approved : r)));
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Báo cáo Doanh thu</h1>
            <p className="text-sm text-muted-foreground">
              Kiểm tra và phê duyệt báo cáo doanh thu Z-Bon / POS hàng ngày.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter value={period} onChange={handlePeriodChange} />
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Làm mới
            </Button>
            <Button asChild>
              <Link href="/revenues/scan">
                <ScanLine className="h-4 w-4" />
                Quét báo cáo
              </Link>
            </Button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Tổng số báo cáo"
            value={loading ? "—" : visibleReports.length}
            icon={<Wallet className="h-5 w-5" />}
          />
          <SummaryCard
            title="Cần kiểm tra"
            value={loading ? "—" : reviewCount}
            icon={<TriangleAlert className="h-5 w-5" />}
            accent={!loading && reviewCount > 0 ? "danger" : undefined}
          />
          <SummaryCard
            title="Tổng doanh thu"
            value={loading ? "—" : formatCurrency(totalGross)}
            icon={<Sigma className="h-5 w-5" />}
          />
        </section>

        {/* Thanh thống kê thuế (tổng hợp phía máy chủ, theo kỳ đã chọn) */}
        <section className="mb-8">
          <TaxSummaryBar
            loading={statsLoading}
            error={statsError}
            items={[
              { label: "Thuế 7%", value: formatCurrency(stats?.totalTax7) },
              { label: "Thuế 19%", value: formatCurrency(stats?.totalTax19) },
              { label: "Tổng thuế", value: formatCurrency(stats?.totalTax) },
              { label: "Số báo cáo", value: stats?.reportCount ?? "—" },
              {
                label: "Tổng doanh thu",
                value: formatCurrency(stats?.totalGrossRevenue),
              },
            ]}
          />
        </section>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Đang tải báo cáo doanh thu…</p>
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/50 px-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">
                Không thể tải báo cáo doanh thu
              </p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </Button>
          </div>
        ) : (
          <RevenueTable reports={visibleReports} onSelect={handleSelect} />
        )}
      </div>

      <RevenueReviewDialog
        report={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        onApprove={handleApprove}
      />
    </main>
  );
}
