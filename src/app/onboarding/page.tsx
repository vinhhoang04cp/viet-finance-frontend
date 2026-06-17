"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Onboarding: user đã đăng nhập nhưng chưa thuộc nhà hàng nào (vd đăng nhập Google lần đầu) tạo nhà
 * hàng đầu tiên. Gọi POST /tenants → nhận JWT gắn tenant mới → vào app.
 */
export default function OnboardingPage() {
  const { createTenant, logout, user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createTenant({
        name: name.trim(),
        address: address.trim() || undefined,
        taxId: taxId.trim() || undefined,
      });
      router.replace("/");
    } catch {
      setError("Không tạo được nhà hàng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Tạo nhà hàng đầu tiên"
      description={
        user ? `Chào ${user.fullName}! Hãy tạo nhà hàng để bắt đầu.` : "Hãy tạo nhà hàng để bắt đầu."
      }
      footer={
        <button onClick={() => logout()} className="text-muted-foreground hover:underline">
          Đăng xuất
        </button>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Tên nhà hàng</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Phở Việt Berlin" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="address">Địa chỉ (tùy chọn)</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Kantstraße 1, 10623 Berlin" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="taxId">Mã số thuế (tùy chọn)</Label>
          <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="47/647/00428" />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Tạo nhà hàng
        </Button>
      </form>
    </AuthCard>
  );
}
