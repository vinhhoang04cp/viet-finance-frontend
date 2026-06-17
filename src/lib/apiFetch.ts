import { refreshTokens } from "@/lib/auth/authApi";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth/storage";

/**
 * Sự kiện phát ra khi phiên hết hạn (refresh thất bại). `AuthProvider` lắng nghe để clear state +
 * redirect về /auth/login. Tách qua window event để `apiFetch` không phụ thuộc React context.
 */
export const AUTH_EXPIRED_EVENT = "vf:auth-expired";

function emitAuthExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

// Gom các request 401 trong lúc đang refresh để chỉ refresh MỘT lần (tránh N request → N refresh).
let isRefreshing = false;
let waiters: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

function flush(error: unknown | null) {
  waiters.forEach((w) => (error ? w.reject(error) : w.resolve()));
  waiters = [];
}

/** Gọi /auth/refresh một lần; cập nhật access token mới vào localStorage. */
async function doRefresh(): Promise<boolean> {
  try {
    const tokens = await refreshTokens();
    setAccessToken(tokens.accessToken);
    return true;
  } catch {
    return false;
  }
}

function withAuthHeader(init: RequestInit): RequestInit {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers, credentials: "same-origin" };
}

/**
 * fetch trung tâm cho mọi lời gọi API nghiệp vụ (Invoice/Revenue/Users/Tenants):
 * 1. Tự gắn `Authorization: Bearer {accessToken}`.
 * 2. Nếu nhận 401 → thử refresh MỘT lần (gom queue) → thành công thì retry request; thất bại thì
 *    clear token + phát sự kiện hết phiên (AuthProvider redirect login).
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, withAuthHeader(init));
  if (res.status !== 401) return res;

  // 401 → cần refresh. Nếu đang có refresh chạy, chờ nó xong rồi retry.
  if (isRefreshing) {
    try {
      await new Promise<void>((resolve, reject) => waiters.push({ resolve, reject }));
      return fetch(input, withAuthHeader(init));
    } catch {
      return res; // refresh (do request khác khởi xướng) đã thất bại
    }
  }

  isRefreshing = true;
  const ok = await doRefresh();
  isRefreshing = false;

  if (ok) {
    flush(null);
    return fetch(input, withAuthHeader(init));
  }

  flush(new Error("session expired"));
  clearAccessToken();
  emitAuthExpired();
  return res;
}
