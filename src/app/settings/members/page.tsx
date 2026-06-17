"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth/AuthContext";
import { getMembers, inviteMember, removeMember, updateMemberRole } from "@/lib/settingsApi";
import { ROLE_LABELS, type Member, type MemberRole } from "@/types/auth";

const ROLES: MemberRole[] = ["OWNER", "ACCOUNTANT", "VIEWER"];

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: MemberRole;
  onChange: (r: MemberRole) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as MemberRole)}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}

export default function MembersPage() {
  const { currentTenant, role, user } = useAuth();
  const tenantId = currentTenant?.tenantId;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);

  const reload = useCallback(async () => {
    if (tenantId == null) return;
    setLoading(true);
    try {
      setMembers(await getMembers(tenantId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void (async () => {
      if (role !== "OWNER") {
        setLoading(false);
        return;
      }
      await reload();
    })();
  }, [role, reload]);

  if (role !== "OWNER") {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Thành viên</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Chỉ Chủ sở hữu nhà hàng mới quản lý được thành viên.
        </p>
      </div>
    );
  }

  async function changeRole(m: Member, newRole: MemberRole) {
    if (m.role === newRole) return;
    try {
      await updateMemberRole(tenantId!, m.userId, newRole);
      toast.success("Đã đổi vai trò.");
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đổi vai trò thất bại.");
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await removeMember(tenantId!, removing.userId);
      toast.success("Đã xóa thành viên.");
      setRemoving(null);
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xóa thành viên thất bại.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Thành viên</h1>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Mời thành viên
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-40">Vai trò</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Đang tải…
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Chưa có thành viên.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => {
                const isSelf = m.userId === user?.id;
                return (
                  <TableRow key={m.userId}>
                    <TableCell className="font-medium">
                      {m.fullName}
                      {isSelf && <span className="ml-1 text-xs text-muted-foreground">(bạn)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      <RoleSelect value={m.role} disabled={isSelf} onChange={(r) => changeRole(m, r)} />
                    </TableCell>
                    <TableCell>
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemoving(m)}
                          aria-label="Xóa thành viên"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={() => void reload()}
        tenantId={tenantId!}
      />

      {/* Xác nhận xóa */}
      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa thành viên</DialogTitle>
            <DialogDescription>
              Xóa <span className="font-medium">{removing?.fullName}</span> khỏi nhà hàng? Tài khoản
              người dùng không bị xóa, chỉ gỡ khỏi nhà hàng này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  onInvited,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInvited: () => void;
  tenantId: number;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("ACCOUNTANT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await inviteMember(tenantId, email.trim(), role);
      toast.success("Đã mời thành viên.");
      setEmail("");
      setRole("ACCOUNTANT");
      onOpenChange(false);
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mời thành viên thất bại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mời thành viên</DialogTitle>
          <DialogDescription>Nhập email và chọn vai trò trong nhà hàng.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="thanhvien@nhahang.de"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-role">Vai trò</Label>
            <RoleSelect value={role} onChange={setRole} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Mời
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
