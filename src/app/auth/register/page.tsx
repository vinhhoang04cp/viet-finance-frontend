"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthError } from "@/lib/auth/authApi";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password, tenantName: tenantName.trim() });
      router.replace("/");
    } catch (err) {
      if (err instanceof AuthError && err.status === 409) {
        setError("Email đã được sử dụng.");
      } else if (err instanceof AuthError && err.status === 400) {
        setError(err.message);
      } else {
        setError("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Đăng ký"
      description="Tạo tài khoản và nhà hàng đầu tiên của bạn."
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="fullName">Họ tên</Label>
          <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@nhahang.de" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              placeholder="Ít nhất 8 ký tự"
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

        <div className="grid gap-1.5">
          <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
          <Input id="confirm" type={showPassword ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="tenantName">Tên nhà hàng</Label>
          <Input id="tenantName" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Phở Việt Berlin" />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Đăng ký
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">hoặc</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton label="Đăng ký bằng Google" />
    </AuthCard>
  );
}
