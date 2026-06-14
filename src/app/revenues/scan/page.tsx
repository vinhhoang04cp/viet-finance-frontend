"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ScanLine,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { LabeledInput } from "@/components/forms/LabeledInput";
import {
  createRevenue,
  extractRevenue,
  extractRevenueBatch,
} from "@/lib/revenueApi";
import { BatchUpload } from "@/components/upload/BatchUpload";
import { ScanModeTabs, type ScanMode } from "@/components/upload/ScanModeTabs";
import type { RevenueCreateRequest, RevenueReport } from "@/types/revenue";

type FormState = Record<string, string>;

function toForm(r: RevenueReport): FormState {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return {
    storeName: s(r.storeName),
    reportNumber: s(r.reportNumber),
    reportDate: s(r.reportDate),
    posSystemName: s(r.posSystemName),
    tseZaehler: s(r.tseZaehler),
    netRevenue: s(r.netRevenue),
    taxAmount: s(r.taxAmount),
    grossRevenue: s(r.grossRevenue),
    taxAmount7: s(r.taxAmount7),
    taxAmount19: s(r.taxAmount19),
    taxRates: s(r.taxRates),
    totalTransactions: s(r.totalTransactions),
    cashRevenue: s(r.cashRevenue),
    cardRevenue: s(r.cardRevenue),
    creditCardRevenue: s(r.creditCardRevenue),
    paypalRevenue: s(r.paypalRevenue),
    voucherRevenue: s(r.voucherRevenue),
    invoiceRevenue: s(r.invoiceRevenue),
    tipAmount: s(r.tipAmount),
  };
}

function num(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export default function RevenueScanPage() {
  const [mode, setMode] = React.useState<ScanMode>("single");
  const [file, setFile] = React.useState<File | null>(null);
  const [extracting, setExtracting] = React.useState(false);
  const [extracted, setExtracted] = React.useState<RevenueReport | null>(null);
  const [form, setForm] = React.useState<FormState>({});
  const [saving, setSaving] = React.useState(false);
  const [savedId, setSavedId] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const set = (key: string) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleExtract() {
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const r = await extractRevenue(file);
      setExtracted(r);
      setForm(toForm(r));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trích xuất thất bại.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    setError(null);
    const missing: string[] = [];
    if (!form.storeName?.trim()) missing.push("Chi nhánh");
    if (!form.reportNumber?.trim()) missing.push("Mã báo cáo");
    if (num(form.netRevenue) === null) missing.push("Doanh thu thuần");
    if (num(form.grossRevenue) === null) missing.push("Tổng doanh thu");
    if (missing.length > 0) {
      setError(`Vui lòng nhập các trường bắt buộc: ${missing.join(", ")}.`);
      return;
    }

    const t = form.totalTransactions.trim();
    const payload: RevenueCreateRequest = {
      storeName: form.storeName.trim(),
      reportNumber: form.reportNumber.trim(),
      reportDate: form.reportDate || null,
      posSystemName: form.posSystemName || null,
      tseZaehler: form.tseZaehler || null,
      netRevenue: num(form.netRevenue)!,
      grossRevenue: num(form.grossRevenue)!,
      taxAmount: num(form.taxAmount),
      taxAmount7: num(form.taxAmount7),
      taxAmount19: num(form.taxAmount19),
      taxRates: form.taxRates || null,
      totalTransactions: t === "" ? null : parseInt(t, 10),
      cashRevenue: num(form.cashRevenue),
      cardRevenue: num(form.cardRevenue),
      creditCardRevenue: num(form.creditCardRevenue),
      paypalRevenue: num(form.paypalRevenue),
      voucherRevenue: num(form.voucherRevenue),
      invoiceRevenue: num(form.invoiceRevenue),
      tipAmount: num(form.tipAmount),
    };

    setSaving(true);
    try {
      const saved = await createRevenue(payload);
      setSavedId(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setFile(null);
    setExtracted(null);
    setForm({});
    setSavedId(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ScanLine className="h-6 w-6" />
            Quét báo cáo doanh thu
          </h1>
          <p className="text-sm text-muted-foreground">
            Tải lên báo cáo Z-Bon / POS hàng ngày — hệ thống AI trích xuất số liệu
            để bạn kiểm tra trước khi lưu.
          </p>
        </header>

        <ScanModeTabs mode={mode} onChange={setMode} />

        {/* Batch mode: queue many files for async extraction */}
        {mode === "batch" ? (
          <BatchUpload
            onUpload={extractRevenueBatch}
            reviewHref="/revenues"
            reviewLabel="Đến danh sách báo cáo"
          />
        ) : savedId !== null ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <div>
                <p className="text-lg font-semibold">
                  Đã lưu báo cáo doanh thu (#{savedId})
                </p>
                <p className="text-sm text-muted-foreground">
                  Báo cáo đã được lưu vào cơ sở dữ liệu.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={reset}>
                  <ScanLine className="h-4 w-4" />
                  Quét báo cáo khác
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/revenues">Đến danh sách báo cáo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Tải lên tài liệu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileDropzone
                  file={file}
                  onFileChange={(f) => {
                    setFile(f);
                    setExtracted(null);
                  }}
                  disabled={extracting}
                />
                {file && !extracted && (
                  <Button onClick={handleExtract} disabled={extracting}>
                    {extracting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ScanLine className="h-4 w-4" />
                    )}
                    Trích xuất dữ liệu
                  </Button>
                )}
              </CardContent>
            </Card>

            {extracted && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      2. Kiểm tra &amp; lưu
                    </CardTitle>
                    {extracted.requiresManualReview && (
                      <Badge variant="warning">
                        <AlertTriangle className="h-3 w-3" />
                        AI gắn cờ cần kiểm tra
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabeledInput id="storeName" label="Chi nhánh" required value={form.storeName ?? ""} onChange={set("storeName")} />
                    <LabeledInput id="reportNumber" label="Mã báo cáo" required mono value={form.reportNumber ?? ""} onChange={set("reportNumber")} />
                    <LabeledInput id="reportDate" label="Ngày báo cáo" type="date" value={form.reportDate ?? ""} onChange={set("reportDate")} />
                    <LabeledInput id="posSystemName" label="Hệ thống POS" value={form.posSystemName ?? ""} onChange={set("posSystemName")} placeholder="vd: orderbird" />
                    <LabeledInput id="tseZaehler" label="Z-Bon / TSE" mono value={form.tseZaehler ?? ""} onChange={set("tseZaehler")} />
                    <LabeledInput id="totalTransactions" label="Số giao dịch" type="number" step="1" value={form.totalTransactions ?? ""} onChange={set("totalTransactions")} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <LabeledInput id="netRevenue" label="Doanh thu thuần (EUR)" type="number" step="0.01" required value={form.netRevenue ?? ""} onChange={set("netRevenue")} />
                    <LabeledInput id="taxAmount" label="Tổng thuế (EUR)" type="number" step="0.01" value={form.taxAmount ?? ""} onChange={set("taxAmount")} />
                    <LabeledInput id="grossRevenue" label="Tổng doanh thu (EUR)" type="number" step="0.01" required value={form.grossRevenue ?? ""} onChange={set("grossRevenue")} />
                    <LabeledInput id="taxAmount7" label="Thuế 7% (EUR)" type="number" step="0.01" value={form.taxAmount7 ?? ""} onChange={set("taxAmount7")} />
                    <LabeledInput id="taxAmount19" label="Thuế 19% (EUR)" type="number" step="0.01" value={form.taxAmount19 ?? ""} onChange={set("taxAmount19")} />
                    <LabeledInput id="taxRates" label="Mức thuế" value={form.taxRates ?? ""} onChange={set("taxRates")} placeholder="vd: 7%, 19%" />
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                      Phương thức thanh toán
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <LabeledInput id="cashRevenue" label="Tiền mặt" type="number" step="0.01" value={form.cashRevenue ?? ""} onChange={set("cashRevenue")} />
                      <LabeledInput id="cardRevenue" label="Thẻ EC" type="number" step="0.01" value={form.cardRevenue ?? ""} onChange={set("cardRevenue")} />
                      <LabeledInput id="creditCardRevenue" label="Thẻ tín dụng" type="number" step="0.01" value={form.creditCardRevenue ?? ""} onChange={set("creditCardRevenue")} />
                      <LabeledInput id="paypalRevenue" label="PayPal" type="number" step="0.01" value={form.paypalRevenue ?? ""} onChange={set("paypalRevenue")} />
                      <LabeledInput id="voucherRevenue" label="Voucher" type="number" step="0.01" value={form.voucherRevenue ?? ""} onChange={set("voucherRevenue")} />
                      <LabeledInput id="invoiceRevenue" label="Ghi nợ" type="number" step="0.01" value={form.invoiceRevenue ?? ""} onChange={set("invoiceRevenue")} />
                      <LabeledInput id="tipAmount" label="Tiền Tip" type="number" step="0.01" value={form.tipAmount ?? ""} onChange={set("tipAmount")} />
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={reset} disabled={saving}>
                      Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Lưu vào cơ sở dữ liệu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && !extracted && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
