"use client";

import { FileText, Layers } from "lucide-react";

import { cn } from "@/lib/utils";

export type ScanMode = "single" | "batch";

const TABS: { id: ScanMode; label: string; icon: typeof FileText }[] = [
  { id: "single", label: "Đơn lẻ (kiểm tra & lưu)", icon: FileText },
  { id: "batch", label: "Hàng loạt (xếp hàng nhiều file)", icon: Layers },
];

/** Toggle between the single review-and-save flow and the async batch queue. */
export function ScanModeTabs({
  mode,
  onChange,
}: {
  mode: ScanMode;
  onChange: (mode: ScanMode) => void;
}) {
  return (
    <div className="mb-6 inline-flex rounded-lg border bg-card p-1">
      {TABS.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              mode === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
