import { describeError } from "@/lib/api";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";
import type { Member, MemberRole, Tenant, User } from "@/types/auth";

const USERS_URL = `${API_BASE_URL}/api/v1/users`;
const TENANTS_URL = `${API_BASE_URL}/api/v1/tenants`;
const JSON_HEADERS = { "Content-Type": "application/json" };

async function readJson<T>(res: Response, action: string): Promise<T> {
  if (!res.ok) throw new Error(await describeError(res, action));
  return (await res.json()) as T;
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function updateProfile(fullName: string, avatarUrl?: string): Promise<User> {
  const res = await apiFetch(`${USERS_URL}/me`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ fullName, avatarUrl }),
  });
  return readJson<User>(res, "cập nhật hồ sơ");
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch(`${USERS_URL}/me/password`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (res.status === 401) throw new Error("Mật khẩu hiện tại không đúng.");
  if (!res.ok) throw new Error(await describeError(res, "đổi mật khẩu"));
}

// ── Tenant members (OWNER) ───────────────────────────────────────────────────

export async function getMembers(tenantId: number): Promise<Member[]> {
  const res = await apiFetch(`${TENANTS_URL}/${tenantId}/members`);
  return readJson<Member[]>(res, "tải danh sách thành viên");
}

export async function inviteMember(tenantId: number, email: string, role: MemberRole): Promise<Member> {
  const res = await apiFetch(`${TENANTS_URL}/${tenantId}/members`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, role }),
  });
  return readJson<Member>(res, "mời thành viên");
}

export async function updateMemberRole(
  tenantId: number,
  memberUserId: number,
  role: MemberRole
): Promise<Member> {
  const res = await apiFetch(`${TENANTS_URL}/${tenantId}/members/${memberUserId}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ role }),
  });
  return readJson<Member>(res, "đổi vai trò");
}

export async function removeMember(tenantId: number, memberUserId: number): Promise<void> {
  const res = await apiFetch(`${TENANTS_URL}/${tenantId}/members/${memberUserId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await describeError(res, "xóa thành viên"));
}

// ── Tenant info (OWNER) ──────────────────────────────────────────────────────

export async function getTenant(tenantId: number): Promise<Tenant> {
  const res = await apiFetch(`${TENANTS_URL}/${tenantId}`);
  return readJson<Tenant>(res, "tải thông tin nhà hàng");
}

export async function updateTenant(
  tenantId: number,
  data: { name: string; address?: string; taxId?: string }
): Promise<Tenant> {
  const res = await apiFetch(`${TENANTS_URL}/${tenantId}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  return readJson<Tenant>(res, "cập nhật nhà hàng");
}
