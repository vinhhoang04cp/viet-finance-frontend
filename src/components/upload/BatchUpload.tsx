"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BatchAcceptedResponse } from "@/types/common";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 20 * 1024 * 1024;

interface BatchUploadProps {
  /** Calls the relevant `/extract/batch` endpoint. */
  onUpload: (files: File[]) => Promise<BatchAcceptedResponse>;
  /** Where to send the user to watch results appear. */
  reviewHref: string;
  reviewLabel: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Multi-file uploader for the asynchronous `/extract/batch` endpoints. Files are
 * queued on the backend (RabbitMQ) and processed later, so there is no inline
 * review — the user is pointed to the dashboard to watch results appear.
 */
export function BatchUpload({
  onUpload,
  reviewHref,
  reviewLabel,
}: BatchUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [result, setResult] = React.useState<BatchAcceptedResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const rejected = incoming.filter(
      (f) => !ACCEPTED.includes(f.type) || f.size > MAX_BYTES
    );
    const valid = incoming.filter(
      (f) => ACCEPTED.includes(f.type) && f.size <= MAX_BYTES
    );
    setError(
      rejected.length > 0
        ? `Đã bỏ qua ${rejected.length} file (chỉ PDF/JPEG/PNG tối đa 20 MB).`
        : null
    );
    // De-duplicate by name + size.
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...valid.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      setResult(await onUpload(files));
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải lên hàng loạt thất bại.");
    } finally {
      setUploading(false);
    }
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-12 text-center shadow-sm">
        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        <div>
          <p className="text-lg font-semibold">
            Đã xếp hàng {result.acceptedFiles} file
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {result.message} Quá trình trích xuất chạy nền — kết quả sẽ xuất hiện
            trong danh sách khi hoàn tất.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setResult(null)}>
            <UploadCloud className="h-4 w-4" />
            Tải thêm
          </Button>
          <Button asChild>
            <Link href={reviewHref}>{reviewLabel}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-muted-foreground/50 hover:bg-muted/40",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            Kéo &amp; thả nhiều file, hoặc nhấn để chọn
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, JPEG hoặc PNG &middot; tối đa 20 MB mỗi file
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {files.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card shadow-sm">
          {files.map((f, i) => (
            <li
              key={`${f.name}:${f.size}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(f.size)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={uploading}
                onClick={() =>
                  setFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
                aria-label={`Xóa ${f.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Đã chọn {files.length} file
        </p>
        <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          Xếp hàng {files.length > 0 ? files.length : ""} để trích xuất
        </Button>
      </div>
    </div>
  );
}
