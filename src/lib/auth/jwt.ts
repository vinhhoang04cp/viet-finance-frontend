import type { MemberRole } from "@/types/auth";

/** Các claim trong access token JWT của backend. */
export interface JwtClaims {
  /** userId (claim `sub`). */
  sub: number;
  /** tenantId đang hoạt động (claim `tid`); vắng mặt với token tạm chưa chọn nhà hàng. */
  tid?: number;
  /** vai trò trong tenant (claim `role`); vắng mặt với token tạm. */
  role?: MemberRole;
  /** hết hạn (epoch seconds). */
  exp: number;
}

/**
 * Giải mã payload JWT phía client (KHÔNG xác minh chữ ký — chỉ đọc claim để biết tenant/role hiện
 * tại và thời điểm hết hạn). Việc xác minh thực sự do backend làm trên mỗi request.
 */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const raw = JSON.parse(json) as Record<string, unknown>;
    return {
      sub: Number(raw.sub),
      tid: raw.tid != null ? Number(raw.tid) : undefined,
      role: raw.role as MemberRole | undefined,
      exp: Number(raw.exp),
    };
  } catch {
    return null;
  }
}

/** True nếu token đã hết hạn (có đệm `skewSeconds` để chủ động refresh sớm). */
export function isExpired(token: string, skewSeconds = 0): boolean {
  const claims = decodeJwt(token);
  if (!claims) return true;
  return Date.now() / 1000 >= claims.exp - skewSeconds;
}
