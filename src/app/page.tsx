"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  FileText,
  Loader2,
  RefreshCw,
  ScanLine,
  Sigma,
  TriangleAlert,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { InvoiceReviewDialog } from "@/components/invoices/InvoiceReviewDialog";
import { TaxSummaryBar } from "@/components/statistics/TaxSummaryBar";
import { PeriodFilter, type PeriodFilterLabels } from "@/components/filters/PeriodFilter";
import { toast } from "sonner";

import {
  fetchInvoices,
  fetchInvoiceStatistics,
  updateInvoice,
  updateInvoiceStatus,
} from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ALL_PERIOD,
  isDateInPeriod,
  periodToRange,
  type Period,
} from "@/lib/period";
import type { DocumentStatus } from "@/types/common";
import type {
  EditableInvoiceFields,
  Invoice,
  InvoiceTaxStatistics,
} from "@/types/invoice";

/** English period labels — the invoice surface is intentionally still English. */
const EN_LABELS: PeriodFilterLabels = {
  all: "All",
  allMonths: "Whole year",
  months: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
};

/** Top-of-dashboard KPI card. */
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

export default function DashboardPage() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [period, setPeriod] = React.useState<Period>(ALL_PERIOD);
  const [stats, setStats] = React.useState<InvoiceTaxStatistics | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  const [reloadToken, setReloadToken] = React.useState(0);

  const [selected, setSelected] = React.useState<Invoice | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Id of the invoice whose approval status change is in flight (drives the row spinner).
  const [pendingStatusId, setPendingStatusId] = React.useState<number | null>(null);

  const range = React.useMemo(() => periodToRange(period), [period]);
  const { from, to } = range;

  // Fetch the invoice list (re-runs on manual refresh). State is only set inside
  // the async callbacks; the "loading" reset lives in the refresh handler so the
  // effect body stays free of synchronous setState (react-hooks/set-state-in-effect).
  React.useEffect(() => {
    const controller = new AbortController();
    fetchInvoices(controller.signal)
      .then((data) => {
        setInvoices(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred."
          );
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reloadToken]);

  // Fetch the server-aggregated tax statistics for the selected period.
  React.useEffect(() => {
    const controller = new AbortController();
    fetchInvoiceStatistics(from, to, controller.signal)
      .then((data) => {
        setStats(data);
        setStatsError(null);
      })
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setStatsError(
            err instanceof Error ? err.message : "Could not load statistics."
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

  // The table + KPI cards reflect the same window as the summary bar.
  const visibleInvoices = React.useMemo(
    () => invoices.filter((i) => isDateInPeriod(i.invoiceDate, range)),
    [invoices, range]
  );

  const { reviewCount, totalGross } = React.useMemo(
    () => ({
      reviewCount: visibleInvoices.filter((i) => i.requiresManualReview).length,
      totalGross: visibleInvoices.reduce(
        (sum, i) => sum + (i.grossAmount ?? 0),
        0
      ),
    }),
    [visibleInvoices]
  );

  function handleSelect(invoice: Invoice) {
    setSelected(invoice);
    setDialogOpen(true);
  }

  // Save field corrections (PATCH). The backend re-validates and recomputes
  // `requiresManualReview`, so the returned entity clears its own flag when the
  // figures reconcile. Throws on failure so the dialog surfaces it.
  async function handleSave(id: number, changes: EditableInvoiceFields) {
    const saved = await updateInvoice(id, changes);
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? saved : inv)));
  }

  // Approve / reject from the table (Approval Station). Optimistic update with rollback:
  // flip the row's status immediately for snappy UX, then reconcile with the server response
  // (which also recomputes requiresManualReview). On failure — e.g. the backend's 409 when
  // approving an invoice that still needs review — restore the previous list and toast the error.
  async function handleUpdateStatus(invoice: Invoice, status: DocumentStatus) {
    if (pendingStatusId !== null) return; // one at a time
    const previous = invoices;
    setPendingStatusId(invoice.id);
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoice.id ? { ...inv, status } : inv))
    );
    try {
      const saved = await updateInvoiceStatus(invoice.id, status);
      setInvoices((prev) => prev.map((inv) => (inv.id === saved.id ? saved : inv)));
      toast.success(
        status === "APPROVED"
          ? `Invoice ${saved.invoiceNumber} approved.`
          : `Invoice ${saved.invoiceNumber} rejected.`
      );
    } catch (err) {
      setInvoices(previous); // rollback the optimistic change
      toast.error(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setPendingStatusId(null);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Invoice Review Station
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and correct incoming German accounting invoices.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter
              value={period}
              onChange={handlePeriodChange}
              labels={EN_LABELS}
            />
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/invoices/scan">
                <ScanLine className="h-4 w-4" />
                Scan invoice
              </Link>
            </Button>
          </div>
        </header>

        {/* Summary cards */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Total Invoices"
            value={loading ? "—" : visibleInvoices.length}
            icon={<FileText className="h-5 w-5" />}
          />
          <SummaryCard
            title="Requires Review"
            value={loading ? "—" : reviewCount}
            icon={<TriangleAlert className="h-5 w-5" />}
            accent={!loading && reviewCount > 0 ? "danger" : undefined}
          />
          <SummaryCard
            title="Total Gross Volume"
            value={loading ? "—" : formatCurrency(totalGross)}
            icon={<Sigma className="h-5 w-5" />}
          />
        </section>

        {/* Tax summary bar (server-aggregated, period-aware) */}
        <section className="mb-8">
          <TaxSummaryBar
            loading={statsLoading}
            error={statsError}
            items={[
              { label: "Tax 7%", value: formatCurrency(stats?.totalTax7) },
              { label: "Tax 19%", value: formatCurrency(stats?.totalTax19) },
              { label: "Total tax", value: formatCurrency(stats?.totalTax) },
              { label: "Records", value: stats?.reportCount ?? "—" },
            ]}
          />
        </section>

        {/* Content: loading / error / table */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading invoices…</p>
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/50 px-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">
                Could not load invoices
              </p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : (
          <InvoiceTable
            invoices={visibleInvoices}
            onSelect={handleSelect}
            onUpdateStatus={handleUpdateStatus}
            pendingStatusId={pendingStatusId}
          />
        )}
      </div>

      {/* Review / correct dialog */}
      <InvoiceReviewDialog
        invoice={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />
    </main>
  );
}
