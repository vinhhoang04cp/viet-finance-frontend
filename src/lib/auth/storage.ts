/**
 * Lưu trữ token phía client (mô hình hybrid GĐ3):
 * - <b>access token</b> ở localStorage (gửi qua header Authorization).
 * - <b>refresh token</b> KHÔNG ở đây — nó nằm trong cookie httpOnly do backend đặt, JS không đọc được.
 *
 * Tất cả truy cập localStorage đều guard `typeof window` để an toàn khi render phía server (SSR).
 */
const ACCESS_TOKEN_KEY = "vf_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}
