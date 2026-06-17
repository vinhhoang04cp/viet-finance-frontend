"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  LogOut,
  Plus,
  Settings,
  User as UserIcon,
  Users,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/AuthContext";
import { ROLE_LABELS } from "@/types/auth";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Thanh trên cùng: bộ chuyển nhà hàng (trái) + menu người dùng (phải). */
export function Navbar() {
  const { user, currentTenant, tenants, role, switchTenant, logout } = useAuth();
  const router = useRouter();
  const isOwner = role === "OWNER";

  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b bg-card px-5">
      {/* ── Tenant switcher ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[14rem] truncate font-medium">
              {currentTenant?.tenantName ?? "—"}
            </span>
            {currentTenant && (
              <span className="text-xs text-muted-foreground">· {ROLE_LABELS[currentTenant.role]}</span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Nhà hàng của bạn</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants.map((t) => {
            const active = t.tenantId === currentTenant?.tenantId;
            return (
              <DropdownMenuItem
                key={t.tenantId}
                onSelect={() => {
                  if (!active) void switchTenant(t.tenantId);
                }}
              >
                <Building2 />
                <span className="flex-1 truncate">{t.tenantName}</span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/onboarding")}>
            <Plus />
            Tạo nhà hàng mới
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── User menu ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user ? initialsOf(user.fullName) : "?"}
            </span>
            <span className="hidden max-w-[10rem] truncate font-medium sm:inline">
              {user?.fullName}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="truncate">{user?.fullName}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/settings/profile")}>
            <UserIcon />
            Tài khoản
          </DropdownMenuItem>
          {isOwner && (
            <DropdownMenuItem onSelect={() => router.push("/settings/members")}>
              <Users />
              Thành viên
            </DropdownMenuItem>
          )}
          {isOwner && (
            <DropdownMenuItem onSelect={() => router.push("/settings/restaurant")}>
              <Settings />
              Nhà hàng
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => void logout()}
            className="text-destructive focus:text-destructive"
          >
            <LogOut />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
