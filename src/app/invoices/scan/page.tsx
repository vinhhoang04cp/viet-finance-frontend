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
import { createInvoice, extractInvoice, extractInvoiceBatch } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { BatchUpload } from "@/components/upload/BatchUpload";
import { ScanModeTabs, type ScanMode } from "@/components/upload/ScanModeTabs";
import type { Invoice, InvoiceCreateRequest } from "@/types/invoice";

/** All editable fields are kept as strings for controlled inputs. */
type FormState = Record<string, string>;

function toForm(inv: Invoice): FormState {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return {
    vendorName: s(inv.vendorName),
    invoiceNumber: inv.invoiceNumber === "UNKNOWN" ? "" : s(inv.invoiceNumber),
    invoiceDate: s(inv.invoiceDate),
    netAmount: s(inv.netAmount),
    taxAmount: s(inv.taxAmount),
    taxAmount7: s(inv.taxAmount7),
    taxAmount19: s(inv.taxAmount19),
    grossAmount: s(inv.grossAmount),
    taxRates: s(inv.taxRates),
  };
}

/** Parse a numeric string -> number | null (blank becomes null). */
function num(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export default function InvoiceScanPage() {
  const { canWrite } = useAuth();
  const [mode, setMode] = React.useState<ScanMode>("single");
  const [file, setFile] = React.useState<File | null>(null);
  const [extracting, setExtracting] = React.useState(false);
  const [extracted, setExtracted] = React.useState<Invoice | null>(null);
  const [form, setForm] = React.useState<FormState>({});
  const [saving, setSaving] = React.useState(false);
  const [savedId, setSavedId] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const set = (key: string) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (!canWrite) return <AccessDenied />;

  async function handleExtract() {
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const inv = await extractInvoice(file);
      setExtracted(inv);
      setForm(toForm(inv));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trích xuất thất bại.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    setError(null);

    // Validate required fields up front (backend would otherwise 400).
    const missing: string[] = [];
    if (!form.vendorName?.trim()) missing.push("Tên nhà cung cấp");
    if (!form.invoiceNumber?.trim()) missing.push("Số hóa đơn");
    if (!form.invoiceDate?.trim()) missing.push("Ngày hóa đơn");
    if (num(form.netAmount) === null) missing.push("Tiền chưa thuế");
    if (num(form.grossAmount) === null) missing.push("Tổng tiền");
    if (missing.length > 0) {
      setError(`Vui lòng nhập các trường bắt buộc: ${missing.join(", ")}.`);
      return;
    }

    const payload: InvoiceCreateRequest = {
      vendorName: form.vendorName.trim(),
      invoiceNumber: form.invoiceNumber.trim(),
      invoiceDate: form.invoiceDate,
      netAmount: num(form.netAmount)!,
      grossAmount: num(form.grossAmount)!,
      taxAmount: num(form.taxAmount),
      taxAmount7: num(form.taxAmount7),
      taxAmount19: num(form.taxAmount19),
      taxRates: form.taxRates || null,
    };

    setSaving(true);
    try {
      const saved = await createInvoice(payload);
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
            Quét hóa đơn
          </h1>
          <p className="text-sm text-muted-foreground">
            Tải lên file PDF hoặc ảnh — Azure OCR + GPT-4o trích xuất dữ liệu để
            bạn kiểm tra trước khi lưu.
          </p>
        </header>

        <ScanModeTabs mode={mode} onChange={setMode} />

        {/* Batch mode: queue many files for async extraction */}
        {mode === "batch" ? (
          <BatchUpload
            onUpload={extractInvoiceBatch}
            reviewHref="/"
            reviewLabel="Đến hàng đợi kiểm tra"
          />
        ) : savedId !== null ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <div>
                <p className="text-lg font-semibold">
                  Đã lưu hóa đơn (#{savedId})
                </p>
                <p className="text-sm text-muted-foreground">
                  Hóa đơn đã được lưu vào cơ sở dữ liệu.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={reset}>
                  <ScanLine className="h-4 w-4" />
                  Quét hóa đơn khác
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Đến hàng đợi kiểm tra</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Step 1: upload */}
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

            {/* Step 2: review & save */}
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
                    <LabeledInput
                      id="vendorName"
                      label="Tên nhà cung cấp"
                      required
                      value={form.vendorName ?? ""}
                      onChange={set("vendorName")}
                    />
                    <LabeledInput
                      id="invoiceNumber"
                      label="Số hóa đơn"
                      required
                      mono
                      value={form.invoiceNumber ?? ""}
                      onChange={set("invoiceNumber")}
                    />
                    <LabeledInput
                      id="invoiceDate"
                      label="Ngày hóa đơn"
                      type="date"
                      required
                      value={form.invoiceDate ?? ""}
                      onChange={set("invoiceDate")}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <LabeledInput
                      id="netAmount"
                      label="Tiền chưa thuế (EUR)"
                      type="number"
                      step="0.01"
                      required
                      value={form.netAmount ?? ""}
                      onChange={set("netAmount")}
                    />
                    <LabeledInput
                      id="taxAmount"
                      label="Tổng thuế (EUR)"
                      type="number"
                      step="0.01"
                      value={form.taxAmount ?? ""}
                      onChange={set("taxAmount")}
                    />
                    <LabeledInput
                      id="grossAmount"
                      label="Tổng tiền (EUR)"
                      type="number"
                      step="0.01"
                      required
                      value={form.grossAmount ?? ""}
                      onChange={set("grossAmount")}
                    />
                    <LabeledInput
                      id="taxAmount7"
                      label="Thuế 7% (EUR)"
                      type="number"
                      step="0.01"
                      value={form.taxAmount7 ?? ""}
                      onChange={set("taxAmount7")}
                    />
                    <LabeledInput
                      id="taxAmount19"
                      label="Thuế 19% (EUR)"
                      type="number"
                      step="0.01"
                      value={form.taxAmount19 ?? ""}
                      onChange={set("taxAmount19")}
                    />
                    <LabeledInput
                      id="taxRates"
                      label="Mức thuế"
                      value={form.taxRates ?? ""}
                      onChange={set("taxRates")}
                      placeholder="vd: 7%, 19%"
                    />
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

            {/* Upload-stage error (before extraction) */}
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
