"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTenant, updateTenant } from "@/lib/settingsApi";

export default function RestaurantPage() {
  const { currentTenant, role, refreshProfile } = useAuth();
  const tenantId = currentTenant?.tenantId;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (role !== "OWNER" || tenantId == null) {
        if (active) setLoading(false);
        return;
      }
      try {
        const t = await getTenant(tenantId);
        if (!active) return;
        setName(t.name);
        setAddress(t.address ?? "");
        setTaxId(t.taxId ?? "");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Không tải được nhà hàng.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [role, tenantId]);

  if (role !== "OWNER") {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Nhà hàng</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Chỉ Chủ sở hữu nhà hàng mới chỉnh sửa được thông tin này.
        </p>
      </div>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (tenantId == null) return;
    setSaving(true);
    try {
      await updateTenant(tenantId, {
        name: name.trim(),
        address: address.trim() || undefined,
        taxId: taxId.trim() || undefined,
      });
      await refreshProfile(); // cập nhật tên nhà hàng ở navbar
      toast.success("Đã cập nhật nhà hàng.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Nhà hàng</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin nhà hàng</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tải…
            </div>
          ) : (
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Tên nhà hàng</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="taxId">Mã số thuế (Steuernummer)</Label>
                <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu thay đổi
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
