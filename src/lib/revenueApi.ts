import { API_BASE_URL, describeError } from "@/lib/api";
import type { BatchAcceptedResponse, DocumentStatus } from "@/types/common";
import type { Page } from "@/types/page";
import type {
  EditableRevenueFields,
  RevenueCreateRequest,
  RevenueReport,
  RevenueTaxStatistics,
} from "@/types/revenue";
import type { MonthlyTaxStatistics } from "@/types/statistics";

const REVENUES_URL = `${API_BASE_URL}/api/v1/revenues`;

/**
 * Fetch revenue reports. The backend paginates this endpoint (Spring `Page`),
 * so we request a large page and return the flat `content` array — adequate for
 * the dashboard's client-side aggregation. Switch to true pagination later if
 * the dataset grows.
 */
export async function fetchRevenues(
  signal?: AbortSignal
): Promise<RevenueReport[]> {
  const res = await fetch(`${REVENUES_URL}?size=200&sort=id,desc`, {
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    throw new Error(
      `Failed to load revenue reports (HTTP ${res.status} ${res.statusText}).`
    );
  }

  const page = (await res.json()) as Page<RevenueReport>;
  return page.content ?? [];
}

/**
 * Fetch aggregated revenue tax + audit statistics for an optional date window
 * and approval status (GET /api/v1/revenues/statistics?from&to&status). The date
 * filter is applied server-side on the report period; omitting bounds aggregates all.
 */
export async function fetchRevenueStatistics(
  from: string | null,
  to: string | null,
  status?: DocumentStatus | null,
  signal?: AbortSignal
): Promise<RevenueTaxStatistics> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (status) params.set("status", status);
  const query = params.toString();

  const res = await fetch(
    `${REVENUES_URL}/statistics${query ? `?${query}` : ""}`,
    { cache: "no-store", signal }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to load revenue statistics (HTTP ${res.status} ${res.statusText}).`
    );
  }

  return (await res.json()) as RevenueTaxStatistics;
}

/**
 * Fetch the per-month revenue tax breakdown for a year, optionally filtered by
 * approval status (GET /api/v1/revenues/statistics/monthly?year=&status=).
 * Always 12 zero-filled points; the date dimension is the report period.
 */
export async function fetchRevenueMonthlyStatistics(
  year: number,
  status?: DocumentStatus | null,
  signal?: AbortSignal
): Promise<MonthlyTaxStatistics> {
  const params = new URLSearchParams({ year: String(year) });
  if (status) params.set("status", status);

  const res = await fetch(
    `${REVENUES_URL}/statistics/monthly?${params.toString()}`,
    { cache: "no-store", signal }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to load monthly revenue statistics (HTTP ${res.status} ${res.statusText}).`
    );
  }

  return (await res.json()) as MonthlyTaxStatistics;
}

/**
 * Persist accountant corrections via a partial update
 * (PATCH /api/v1/revenues/{id}) — same rationale as invoices: PUT is
 * full-replacement and would 400 on a partial body. The backend re-runs its
 * dual math validation and recomputes `requiresManualReview`.
 */
export async function updateRevenue(
  id: number,
  changes: EditableRevenueFields
): Promise<RevenueReport> {
  const res = await fetch(`${REVENUES_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });

  if (!res.ok) {
    throw new Error(await describeError(res, `save revenue report #${id}`));
  }

  return (await res.json()) as RevenueReport;
}

/**
 * Transition a revenue report's approval status
 * (PATCH /api/v1/revenues/{id}/status). Moving to `APPROVED` requires the stored
 * figures to reconcile, else the backend responds 409.
 */
export async function updateRevenueStatus(
  id: number,
  status: DocumentStatus
): Promise<RevenueReport> {
  const res = await fetch(`${REVENUES_URL}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error(await describeError(res, `update status of report #${id}`));
  }

  return (await res.json()) as RevenueReport;
}

/**
 * Upload a Z-Bon / POS report for AI extraction
 * (POST /api/v1/revenues/extract). Returns the structured report WITHOUT
 * persisting it (human-in-the-loop); call `createRevenue` to save.
 */
export async function extractRevenue(file: File): Promise<RevenueReport> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${REVENUES_URL}/extract`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await describeError(res, "extract revenue report"));
  }

  return (await res.json()) as RevenueReport;
}

/**
 * Queue multiple revenue-report files for asynchronous extraction
 * (POST /api/v1/revenues/extract/batch). Returns HTTP 202 immediately.
 */
export async function extractRevenueBatch(
  files: File[]
): Promise<BatchAcceptedResponse> {
  const form = new FormData();
  for (const f of files) form.append("files", f);

  const res = await fetch(`${REVENUES_URL}/extract/batch`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await describeError(res, "queue revenue batch"));
  }

  return (await res.json()) as BatchAcceptedResponse;
}

/** Persist a human-verified revenue report (POST /api/v1/revenues). */
export async function createRevenue(
  payload: RevenueCreateRequest
): Promise<RevenueReport> {
  const res = await fetch(REVENUES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await describeError(res, "save revenue report"));
  }

  return (await res.json()) as RevenueReport;
}
