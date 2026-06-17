import { API_BASE_URL, describeError } from "@/lib/api";
import { apiFetch } from "@/lib/apiFetch";
import type { VatCalculation, VatDetails } from "@/types/tax";

const TAX_URL = `${API_BASE_URL}/api/v1/tax`;

/**
 * Tính thuế GTGT phải nộp cho một kỳ (GET /api/v1/tax/calculation?from&to).
 * `from`/`to` ISO `yyyy-MM-dd` (null = không giới hạn). Backend LUÔN chỉ tính trên doanh thu đã
 * duyệt (APPROVED) — không còn tham số trạng thái.
 */
export async function fetchVatCalculation(
  from: string | null,
  to: string | null,
  signal?: AbortSignal
): Promise<VatCalculation> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const res = await apiFetch(
    `${TAX_URL}/calculation${query ? `?${query}` : ""}`,
    { cache: "no-store", signal }
  );

  if (!res.ok) {
    throw new Error(await describeError(res, "tải kết quả tính thuế"));
  }

  return (await res.json()) as VatCalculation;
}

/**
 * Thuế GTGT theo từng tháng trong năm (GET /api/v1/tax/calculation/monthly?year).
 * Luôn trả về đúng 12 điểm (Tháng 1 … Tháng 12), zero-fill cho tháng không có dữ liệu.
 */
export async function fetchVatMonthly(
  year: number,
  signal?: AbortSignal
): Promise<VatCalculation[]> {
  const params = new URLSearchParams({ year: String(year) });

  const res = await apiFetch(
    `${TAX_URL}/calculation/monthly?${params.toString()}`,
    { cache: "no-store", signal }
  );

  if (!res.ok) {
    throw new Error(await describeError(res, "tải thuế theo tháng"));
  }

  return (await res.json()) as VatCalculation[];
}

/**
 * Timeline Zahllast liên tục theo tháng (GET /api/v1/tax/calculation/timeline?from&to) — một
 * điểm/tháng trong khoảng, vắt qua năm. Backs biểu đồ cuốn chiếu "N tháng gần nhất".
 */
export async function fetchVatTimeline(
  from: string | null,
  to: string | null,
  signal?: AbortSignal
): Promise<VatCalculation[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const res = await apiFetch(
    `${TAX_URL}/calculation/timeline${query ? `?${query}` : ""}`,
    { cache: "no-store", signal }
  );

  if (!res.ok) {
    throw new Error(await describeError(res, "tải timeline thuế"));
  }

  return (await res.json()) as VatCalculation[];
}

/**
 * Chi tiết một kỳ (GET /api/v1/tax/calculation/details?from&to): dòng hóa đơn (đầu vào) +
 * báo cáo doanh thu (đầu ra). Backs bảng drill-down khi bấm vào một tháng.
 */
export async function fetchVatDetails(
  from: string | null,
  to: string | null,
  signal?: AbortSignal
): Promise<VatDetails> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const res = await apiFetch(
    `${TAX_URL}/calculation/details${query ? `?${query}` : ""}`,
    { cache: "no-store", signal }
  );

  if (!res.ok) {
    throw new Error(await describeError(res, "tải chi tiết kỳ"));
  }

  return (await res.json()) as VatDetails;
}

/**
 * Tải file Excel báo cáo thuế (GET /api/v1/tax/export?from&to). Đi qua `apiFetch`
 * để mang theo `Authorization` (không thể dùng thẻ <a download> trực tiếp vì cần Bearer),
 * rồi kích hoạt tải xuống bằng object URL. Tên file lấy từ header `Content-Disposition`.
 */
export async function downloadTaxExcel(
  from: string | null,
  to: string | null
): Promise<void> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const res = await apiFetch(`${TAX_URL}/export${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await describeError(res, "xuất file Excel"));
  }

  const blob = await res.blob();
  const filename =
    parseFilename(res.headers.get("Content-Disposition")) ?? "Thue-GTGT.xlsx";

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Lấy tên file từ `Content-Disposition` (ưu tiên `filename*=UTF-8''…`, fallback `filename="…"`). */
function parseFilename(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : null;
}
