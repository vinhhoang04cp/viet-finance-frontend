import { API_BASE_URL } from "@/lib/config";
import type {
  AuthSessionResponse,
  AuthTokens,
  LoginResponse,
  OAuth2ExchangeResponse,
} from "@/types/auth";

const AUTH_URL = `${API_BASE_URL}/api/v1/auth`;
const TENANTS_URL = `${API_BASE_URL}/api/v1/tenants`;

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  tenantName: string;
}

export interface CreateTenantData {
  name: string;
  address?: string;
  taxId?: string;
}

/** Lỗi auth mang theo HTTP status để UI map sang thông điệp tiếng Việt phù hợp. */
export class AuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Lỗi (HTTP ${res.status}).`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* non-JSON */
    }
    throw new AuthError(res.status, message);
  }
  return (await res.json()) as T;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export function register(data: RegisterData): Promise<AuthSessionResponse> {
  return fetch(`${AUTH_URL}/register`, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "same-origin",
    body: JSON.stringify(data),
  }).then((r) => parse<AuthSessionResponse>(r));
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return fetch(`${AUTH_URL}/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "same-origin",
    body: JSON.stringify({ email, password }),
  }).then((r) => parse<LoginResponse>(r));
}

/** Chọn nhà hàng sau login đa-tenant (dùng token tạm trong header). */
export function selectTenant(tenantId: number, token: string): Promise<AuthSessionResponse> {
  return fetch(`${AUTH_URL}/select-tenant`, {
    method: "POST",
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` },
    credentials: "same-origin",
    body: JSON.stringify({ tenantId }),
  }).then((r) => parse<AuthSessionResponse>(r));
}

export function exchangeOAuth2Code(code: string): Promise<OAuth2ExchangeResponse> {
  return fetch(`${AUTH_URL}/oauth2/exchange`, {
    method: "POST",
    headers: JSON_HEADERS,
    credentials: "same-origin",
    body: JSON.stringify({ code }),
  }).then((r) => parse<OAuth2ExchangeResponse>(r));
}

/** Tạo nhà hàng mới (onboarding / mở thêm) — dùng token hiện tại hoặc token tạm. */
export function createTenant(data: CreateTenantData, token: string): Promise<AuthSessionResponse> {
  return fetch(TENANTS_URL, {
    method: "POST",
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` },
    credentials: "same-origin",
    body: JSON.stringify(data),
  }).then((r) => parse<AuthSessionResponse>(r));
}

/**
 * Cấp lại access token. KHÔNG gửi body — refresh token nằm trong cookie httpOnly, browser tự gửi
 * (same-origin). Trả về tokens mới (refresh token cũng được backend xoay vòng + đặt lại cookie).
 */
export function refreshTokens(): Promise<AuthTokens> {
  return fetch(`${AUTH_URL}/refresh`, {
    method: "POST",
    credentials: "same-origin",
  }).then((r) => parse<AuthTokens>(r));
}

/** Đăng xuất — thu hồi refresh token + xóa cookie (backend đọc cookie). */
export function logout(): Promise<void> {
  return fetch(`${AUTH_URL}/logout`, {
    method: "POST",
    credentials: "same-origin",
  }).then(() => undefined);
}

/** URL bắt đầu "Đăng nhập bằng Google" — điều hướng THẲNG tới backend (không qua proxy). */
export function googleAuthorizeUrl(): string {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
  return `${backend}/api/v1/auth/oauth2/authorize/google`;
}
