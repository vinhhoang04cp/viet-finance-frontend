/**
 * Base URL cho API. Mặc định "" → browser gọi same-origin `/api/v1/...`, được Next rewrite proxy
 * (next.config.ts) forward sang Spring Boot phía server (không cần CORS). Đặt
 * `NEXT_PUBLIC_API_BASE_URL` để gọi backend trực tiếp (bỏ proxy, cần CORS).
 *
 * Tách riêng (không import gì) để các module API + apiFetch + authApi dùng chung mà không tạo
 * import vòng.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
