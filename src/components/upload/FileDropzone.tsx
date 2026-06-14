"use client";

import * as React from "react";
import { FileText, UploadCloud, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Accessible drag-and-drop file picker for invoice / revenue uploads.
 * Accepts a single PDF, JPEG or PNG (max 20 MB to match the backend limit).
 */
export function FileDropzone({
  file,
  onFileChange,
  disabled = false,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function validateAndSet(selected: File | undefined) {
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) {
      setError("Định dạng file không hỗ trợ. Vui lòng tải lên PDF, JPEG hoặc PNG.");
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setError("File vượt quá giới hạn 20 MB.");
      return;
    }
    setError(null);
    onFileChange(selected);
  }

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFileChange(null)}
          disabled={disabled}
          aria-label="Xóa file"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          validateAndSet(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-muted-foreground/50 hover:bg-muted/40",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            Kéo &amp; thả file vào đây, hoặc nhấn để chọn
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, JPEG hoặc PNG &middot; tối đa 20 MB
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => validateAndSet(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
