"use client";

import { useState } from "react";
import { Building2, ChevronRight, Plus, Loader2 } from "lucide-react";

import { ROLE_LABELS, type TenantMembership } from "@/types/auth";
import { cn } from "@/lib/utils";

/**
 * Danh sách nhà hàng để chọn (dùng ở login đa-tenant và sẽ tái dùng ở navbar switcher).
 * Mỗi mục hiển thị tên + vai trò (tiếng Việt). Có nút "Tạo nhà hàng mới".
 */
export function TenantSelector({
  options,
  onSelect,
  onCreateNew,
}: {
  options: TenantMembership[];
  onSelect: (tenantId: number) => void | Promise<void>;
  onCreateNew?: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handle(tenantId: number) {
    setBusyId(tenantId);
    try {
      await onSelect(tenantId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {options.map((t) => {
        const busy = busyId === t.tenantId;
        return (
          <button
            key={t.tenantId}
            type="button"
            disabled={busyId !== null}
            onClick={() => handle(t.tenantId)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
              "hover:bg-accent disabled:opacity-60"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.tenantName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[t.role]}</p>
            </div>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        );
      })}

      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          className="flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Plus className="h-4 w-4" />
          </div>
          Tạo nhà hàng mới
        </button>
      )}
    </div>
  );
}
