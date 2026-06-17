"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { TenantSelector } from "@/components/auth/TenantSelector";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import type { TenantMembership } from "@/types/auth";

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { completeOAuthCode, selectTenant } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [tenantOptions, setTenantOptions] = useState<TenantMembership[] | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // chống chạy 2 lần (StrictMode) — code dùng-một-lần
    ran.current = true;

    void (async () => {
      const errorParam = params.get("error");
      const code = params.get("code");
      if (errorParam) {
        setError(params.get("message") || "Đăng nhập bằng Google thất bại.");
        return;
      }
      if (!code) {
        setError("Thiếu mã xác thực từ Google.");
        return;
      }
      try {
        const result = await completeOAuthCode(code);
        if (result.type === "success") router.replace("/");
        else if (result.type === "noTenant") router.replace("/onboarding");
        else setTenantOptions(result.options);
      } catch {
        setError("Xác thực thất bại hoặc mã đã hết hạn. Vui lòng thử lại.");
      }
    })();
  }, [params, completeOAuthCode, router]);

  if (error) {
    return (
      <AuthCard title="Đăng nhập thất bại" description={error}>
        <Button asChild className="w-full">
          <Link href="/auth/login">Quay lại đăng nhập</Link>
        </Button>
      </AuthCard>
    );
  }

  if (tenantOptions) {
    return (
      <AuthCard title="Chọn nhà hàng" description="Tài khoản của bạn thuộc nhiều nhà hàng.">
        <TenantSelector
          options={tenantOptions}
          onSelect={async (tenantId) => {
            await selectTenant(tenantId);
            router.replace("/");
          }}
          onCreateNew={() => router.push("/onboarding")}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Đang xác thực…" description="Vui lòng đợi trong giây lát.">
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Đang xử lý đăng nhập Google…
      </div>
    </AuthCard>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Đang tải…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
