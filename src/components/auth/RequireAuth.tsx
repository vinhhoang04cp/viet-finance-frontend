"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Guard phía client cho các trang cần đăng nhập (token ở localStorage → middleware server không đọc
 * được, nên guard ở client). Chưa đăng nhập → /auth/login. Đã đăng nhập nhưng chưa có nhà hàng và
 * trang yêu cầu tenant → /onboarding.
 */
export function RequireAuth({
  children,
  requireTenant = true,
}: {
  children: React.ReactNode;
  requireTenant?: boolean;
}) {
  const { isAuthenticated, isLoading, currentTenant } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const needsTenant = requireTenant && !currentTenant;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const returnUrl =
        pathname && pathname !== "/" ? `?returnUrl=${encodeURIComponent(pathname)}` : "";
      router.replace(`/auth/login${returnUrl}`);
    } else if (needsTenant) {
      router.replace("/onboarding");
    }
  }, [isLoading, isAuthenticated, needsTenant, router, pathname]);

  if (isLoading || !isAuthenticated || needsTenant) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải…
      </div>
    );
  }
  return <>{children}</>;
}
