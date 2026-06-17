"use client";

import { usePathname } from "next/navigation";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

/**
 * Khung ứng dụng: quyết định layout theo route.
 * - {@code /auth/*} → toàn màn hình, công khai (login/register/callback).
 * - {@code /onboarding} → cần đăng nhập nhưng CHƯA cần nhà hàng; toàn màn hình.
 * - còn lại → cần đăng nhập + nhà hàng; có Sidebar (navbar thêm ở Commit 3).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  if (pathname === "/onboarding") {
    return <RequireAuth requireTenant={false}>{children}</RequireAuth>;
  }

  return (
    <RequireAuth>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Navbar />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </RequireAuth>
  );
}
