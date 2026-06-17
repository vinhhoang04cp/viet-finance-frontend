"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Download,
  Landmark,
  RefreshCw,
  Scale,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/statistics/StatCard";
import { MonthlyVatBarChart } from "@/components/statistics/MonthlyVatBarChart";
import {
  InvoiceLineItemsTable,
  RevenueLineItemsTable,
} from "@/components/statistics/LineItemsTables";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import {
  fetchVatCalculation,
  fetchVatTimeline,
  fetchVatDetails,
  downloadTaxExcel,
} from "@/lib/taxApi";
import { cn, formatCurrency } from "@/lib/utils";
import { periodToRange, type Period } from "@/lib/period";
import {
  DEFAULT_TIMELINE_MONTHS,
  TIMELINE_RANGES,
  recentRange,
} from "@/lib/statistics";
import type { VatCalculation, VatDetails, VatStatus } from "@/types/tax";

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/** Diễn giải kết luận Zahllast theo trạng thái. */
function statusConclusion(c: VatCalculation): { text: string; tone: VatStatus } {
  switch (c.status) {
    case "PAYABLE":
      return { text: `Phải nộp ${formatCurrency(c.totalVatPayable)} cho cơ quan thuế`, tone: "PAYABLE" };
    case "REFUNDABLE":
      return { text: `Được hoàn ${formatCurrency(Math.abs(c.totalVatPayable))}`, tone: "REFUNDABLE" };
    default:
      return { text: "Cân bằng — không phải nộp, không được hoàn", tone: "BALANCED" };
  }
}

const TONE_CLASS: Record<VatStatus, string> = {
  PAYABLE: "border-red-200 bg-red-50/60 text-red-700",
  REFUNDABLE: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
  BALANCED: "border-slate-200 bg-slate-50/60 text-slate-700",
};

export default function TaxPage() {
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  const [period, setPeriod] = React.useState<Period>({ year: currentYear, month: "all" });
  const [months, setMonths] = React.useState<number>(DEFAULT_TIMELINE_MONTHS);

  const [calc, setCalc] = React.useState<VatCalculation | null>(null);
  const [timeline, setTimeline] = React.useState<VatCalculation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  // Selected month for the drill-down (null = closed).
  const [selected, setSelected] = React.useState<VatCalculation | null>(null);
  const [details, setDetails] = React.useState<VatDetails | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const range = React.useMemo(() => periodToRange(period), [period]);
  const chartRange = React.useMemo(() => recentRange(months), [months]);

  // Tải song song: tính cho kỳ đã chọn (summary) + timeline cuốn chiếu N tháng cho biểu đồ.
  React.useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetchVatCalculation(range.from, range.to, controller.signal),
      fetchVatTimeline(chartRange.from, chartRange.to, controller.signal),
    ])
      .then(([calculation, series]) => {
        setCalc(calculation);
        setTimeline(series);
        setError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Không thể tải dữ liệu thuế.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [range.from, range.to, chartRange.from, chartRange.to, reloadToken]);

  // Drill-down chi tiết cho tháng được chọn trên biểu đồ.
  React.useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();

    fetchVatDetails(selected.periodStart, selected.periodEnd, controller.signal)
      .then((d) => {
        setDetails(d);
        setDetailError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setDetailError(err instanceof Error ? err.message : "Không thể tải chi tiết tháng.");
        }
      })
      .finally(() => setDetailLoading(false));

    return () => controller.abort();
  }, [selected]);

  function openMonth(point: VatCalculation) {
    setDetailLoading(true);
    setDetailError(null);
    setDetails(null);
    setSelected(point);
  }
  function changePeriod(next: Period) {
    setLoading(true);
    setPeriod(next);
  }
  function changeMonths(next: number) {
    setLoading(true);
    setSelected(null);
    setMonths(next);
  }
  function handleRefresh() {
    setLoading(true);
    setSelected(null);
    setReloadToken((t) => t + 1);
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadTaxExcel(range.from, range.to);
      toast.success("Đã tải file Excel báo cáo thuế.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xuất file Excel.");
    } finally {
      setDownloading(false);
    }
  }

  const conclusion = calc ? statusConclusion(calc) : null;

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Thuế GTGT phải nộp</h1>
            <p className="text-sm text-muted-foreground">
              Zahllast = thuế đầu ra (doanh thu) − thuế đầu vào (hóa đơn), tách theo 7% / 19%.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Làm mới
            </Button>
            <Button onClick={handleDownload} disabled={downloading || loading}>
              <Download className={cn("h-4 w-4", downloading && "animate-pulse")} />
              {downloading ? "Đang xuất…" : "Xuất Excel"}
            </Button>
          </div>
        </header>

        {/* Bộ lọc */}
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Kỳ:</span>
              <PeriodFilter value={period} onChange={changePeriod} />
            </div>
            {calc && (
              <span className="ml-auto text-sm text-muted-foreground">
                Kỳ: <span className="font-medium text-foreground">{calc.periodLabel}</span>
              </span>
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

        {/* Stat cards */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Thuế phải nộp (Zahllast)"
            value={formatCurrency(calc?.totalVatPayable ?? 0)}
            icon={<Scale className="h-5 w-5" />}
            loading={loading}
            accent="primary"
          />
          <StatCard
            title="Thuế đầu ra (doanh thu)"
            value={formatCurrency(calc?.totalOutputTax ?? 0)}
            icon={<ArrowUpCircle className="h-5 w-5" />}
            loading={loading}
          />
          <StatCard
            title="Thuế đầu vào (hóa đơn)"
            value={formatCurrency(calc?.totalInputTax ?? 0)}
            icon={<ArrowDownCircle className="h-5 w-5" />}
            loading={loading}
          />
        </section>

        {/* Kết luận */}
        {!loading && conclusion && (
          <div
            className={cn(
              "mb-8 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
              TONE_CLASS[conclusion.tone]
            )}
          >
            <Landmark className="h-4 w-4 shrink-0" />
            <span>{conclusion.text}</span>
          </div>
        )}

        {/* Biểu đồ + breakdown */}
        <section className="mb-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Thuế theo tháng
              </CardTitle>
              <select
                className={SELECT_CLASS}
                value={String(months)}
                onChange={(e) => changeMonths(Number(e.target.value))}
                aria-label="Khoảng thời gian biểu đồ"
              >
                {TIMELINE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 w-full animate-pulse rounded-lg bg-muted" />
              ) : (
                <MonthlyVatBarChart data={timeline} onSelectMonth={openMonth} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tách theo thuế suất</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !calc ? (
                <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
              ) : (
                <RateBreakdown calc={calc} />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Drill-down chi tiết tháng */}
        {selected && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Chi tiết {selected.periodLabel}
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
            ) : detailLoading || !details ? (
              <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                    Doanh thu (thuế đầu ra) · {details.revenues.length}
                  </h3>
                  <RevenueLineItemsTable items={details.revenues} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                    Hóa đơn (thuế đầu vào) · {details.invoices.length}
                  </h3>
                  <InvoiceLineItemsTable items={details.invoices} />
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

/** Bảng tách 7% / 19%: thuế đầu ra − thuế đầu vào = phải nộp. */
function RateBreakdown({ calc }: { calc: VatCalculation }) {
  const rows = [
    { label: "7%", output: calc.outputTax7, input: calc.inputTax7, payable: calc.vatPayable7 },
    { label: "19%", output: calc.outputTax19, input: calc.inputTax19, payable: calc.vatPayable19 },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
          <th className="py-2 text-left font-medium">Mức</th>
          <th className="py-2 text-right font-medium">Đầu ra</th>
          <th className="py-2 text-right font-medium">Đầu vào</th>
          <th className="py-2 text-right font-medium">Phải nộp</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.map((r) => (
          <tr key={r.label} className="border-b last:border-0">
            <td className="py-2 font-medium">{r.label}</td>
            <td className="py-2 text-right">{formatCurrency(r.output)}</td>
            <td className="py-2 text-right">{formatCurrency(r.input)}</td>
            <td
              className={cn(
                "py-2 text-right font-medium",
                r.payable > 0 ? "text-red-600" : r.payable < 0 ? "text-emerald-600" : ""
              )}
            >
              {formatCurrency(r.payable)}
            </td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="py-2">Tổng</td>
          <td className="py-2 text-right">{formatCurrency(calc.totalOutputTax)}</td>
          <td className="py-2 text-right">{formatCurrency(calc.totalInputTax)}</td>
          <td
            className={cn(
              "py-2 text-right",
              calc.totalVatPayable > 0
                ? "text-red-600"
                : calc.totalVatPayable < 0
                  ? "text-emerald-600"
                  : ""
            )}
          >
            {formatCurrency(calc.totalVatPayable)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
