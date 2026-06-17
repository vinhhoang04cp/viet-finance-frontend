"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { TenantSelector } from "@/components/auth/TenantSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthError } from "@/lib/auth/authApi";
import type { TenantMembership } from "@/types/auth";

export default function LoginPage() {
  const { login, selectTenant } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantMembership[] | null>(null);

  /** Quay lại trang user đang xem trước khi bị đưa về login (param ?returnUrl), mặc định "/". */
  function destination(): string {
    if (typeof window === "undefined") return "/";
    const rt = new URLSearchParams(window.location.search).get("returnUrl");
    return rt && rt.startsWith("/") && !rt.startsWith("/auth") ? rt : "/";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.type === "selectTenant") {
        setTenantOptions(result.options);
      } else {
        router.replace(destination());
      }
    } catch (err) {
      // Thông điệp chung — KHÔNG phân biệt "email không tồn tại" vs "sai mật khẩu" (bảo mật).
      setError(
        err instanceof AuthError && err.status === 401
          ? "Email hoặc mật khẩu không đúng."
          : "Đăng nhập thất bại. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  if (tenantOptions) {
    return (
      <AuthCard title="Chọn nhà hàng" description="Tài khoản của bạn thuộc nhiều nhà hàng.">
        <TenantSelector
          options={tenantOptions}
          onSelect={async (tenantId) => {
            await selectTenant(tenantId);
            router.replace(destination());
          }}
          onCreateNew={() => router.push("/onboarding")}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Đăng nhập"
      description="Đăng nhập để tiếp tục với VietFinance."
      footer={
        <>
          Chưa có tài khoản?{" "}
          <Link href="/auth/register" className="font-medium text-primary hover:underline">
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@nhahang.de"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Đăng nhập
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">hoặc</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton />
    </AuthCard>
  );
}
