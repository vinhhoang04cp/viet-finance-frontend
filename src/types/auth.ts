/** Vai trò của user trong một nhà hàng (khớp backend MemberRole). */
export type MemberRole = "OWNER" | "ACCOUNTANT" | "VIEWER";

/** Nhãn vai trò tiếng Việt. */
export const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "Chủ sở hữu",
  ACCOUNTANT: "Kế toán",
  VIEWER: "Xem",
};

export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
}

export interface Tenant {
  id: number;
  name: string;
  address?: string | null;
  taxId?: string | null;
  active: boolean;
}

/** Một nhà hàng user tham gia + vai trò (khớp TenantOptionResponse của backend). */
export interface TenantMembership {
  tenantId: number;
  tenantName: string;
  role: MemberRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/** Response của /auth/register, /auth/select-tenant, POST /tenants. */
export interface AuthSessionResponse {
  user: User;
  tenant: Tenant;
  tokens: AuthTokens;
}

/** Response của /auth/login (NON_NULL — trường vắng mặt khi không áp dụng). */
export interface LoginResponse {
  tenantSelectionRequired: boolean;
  user?: User;
  tenant?: Tenant;
  tokens?: AuthTokens;
  tempAccessToken?: string;
  expiresIn?: number;
  tenantOptions?: TenantMembership[];
}

/** Response của /auth/oauth2/exchange. */
export interface OAuth2ExchangeResponse {
  tenantSelectionRequired: boolean;
  noTenant: boolean;
  user?: User;
  tenant?: Tenant;
  tokens?: AuthTokens;
  tempAccessToken?: string;
  expiresIn?: number;
  tenantOptions?: TenantMembership[];
}

/** Response của GET /users/me. */
export interface UserProfileResponse {
  user: User;
  tenants: TenantMembership[];
}

/** Một thành viên trong nhà hàng (GET /tenants/{id}/members). */
export interface Member {
  userId: number;
  email: string;
  fullName: string;
  role: MemberRole;
}
