"use client";

import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { changePassword, updateProfile } from "@/lib/settingsApi";
import { ROLE_LABELS } from "@/types/auth";

export default function ProfilePage() {
  const { user, tenants, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  async function saveName() {
    if (!fullName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(fullName.trim());
      await refreshProfile();
      toast.success("Đã cập nhật hồ sơ.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại.");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Tài khoản</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="fullName">Họ tên</Label>
            <div className="flex gap-2">
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Button onClick={saveName} disabled={savingName || fullName.trim() === user?.fullName}>
                {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu
              </Button>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bảo mật</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setPwOpen(true)}>
            Đổi mật khẩu
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nhà hàng của bạn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tenants.map((t) => (
            <div key={t.tenantId} className="flex items-center gap-3 rounded-lg border px-4 py-2.5">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-sm font-medium">{t.tenantName}</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[t.role]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setOld("");
    setNew("");
    setConfirm("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) return setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
    if (newPassword !== confirm) return setError("Mật khẩu xác nhận không khớp.");
    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success("Đã đổi mật khẩu.");
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
          <DialogDescription>Nhập mật khẩu hiện tại và mật khẩu mới.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="old">Mật khẩu hiện tại</Label>
            <Input id="old" type="password" required value={oldPassword} onChange={(e) => setOld(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new">Mật khẩu mới</Label>
            <Input id="new" type="password" required value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="Ít nhất 8 ký tự" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm">Xác nhận mật khẩu mới</Label>
            <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Đổi mật khẩu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
