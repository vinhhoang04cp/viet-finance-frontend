import type {
  EditableInvoiceFields,
  Invoice,
  InvoiceCreateRequest,
  InvoiceTaxStatistics,
} from "@/types/invoice";
import type { BatchAcceptedResponse, DocumentStatus } from "@/types/common";
import type {
  InvoiceLineItem,
  MonthlyTaxStatistics,
  TaxTimeline,
} from "@/types/statistics";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";

// Re-export để các module hiện có (revenueApi) tiếp tục import từ "@/lib/api".
export { API_BASE_URL };

const INVOICES_URL = `${API_BASE_URL}/api/v1/invoices`;

/**
 * Fetch every invoice from the backend.
 *
 * Throws on a non-2xx response so callers can render a dedicated error state.
 * `cache: "no-store"` keeps the review queue fresh on every load.
 */
export async function fetchInvoices(signal?: AbortSignal): Promise<Invoice[]> {
  const res = await apiFetch(INVOICES_URL, { cache: "no-store", signal });

  if (!res.ok) {
    throw new Error(
      `Failed to load invoices (HTTP ${res.status} ${res.statusText}).`
    );
  }

  return (await res.json()) as Invoice[];
}

/**
 * Fetch aggregated invoice tax statistics for an optional date window
 * (GET /api/v1/invoices/statistics?from&to). The aggregation runs server-side
 * (DB SUM/COUNT); omitting both bounds aggregates every invoice.
 *
 * Throws on a non-2xx response so callers can render a dedicated error state.
 */
export async function fetchInvoiceStatistics(
  from: string | null,
  to: string | null,
  signal?: AbortSignal
): Promise<InvoiceTaxStatistics> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const res = await apiFetch(
    `${INVOICES_URL}/statistics${query ? `?${query}` : ""}`,
    { cache: "no-store", signal }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to load invoice statistics (HTTP ${res.status} ${res.statusText}).`
    );
  }

  return (await res.json()) as InvoiceTaxStatistics;
}

/**
 * Fetch the per-month invoice tax breakdown
 * (GET /api/v1/invoices/statistics/monthly?year=). Always 12 zero-filled points.
 * Pass `year = null` to aggregate every month across all years.
 */
export async function fetchInvoiceMonthlyStatistics(
  year: number | null,
  signal?: AbortSignal
): Promise<MonthlyTaxStatistics> {
  const query = year != null ? `?year=${year}` : "";
  const res = await apiFetch(`${INVOICES_URL}/statistics/monthly${query}`, {
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    throw new Error(
      `Failed to load monthly invoice statistics (HTTP ${res.status} ${res.statusText}).`
    );
  }

  return (await res.json()) as MonthlyTaxStatistics;
}

/**
 * Fetch the CONTINUOUS invoice tax timeline
 * (GET /api/v1/invoices/statistics/timeline?from&to) — one point per calendar month in the window,
 * spanning year boundaries. Drives the dashboard's rolling "last N months" chart.
 */
export async function fetchInvoiceTimeline(
  from: string | null,
  to: string | null,
  signal?: AbortSignal
): Promise<TaxTimeline> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const res = await apiFetch(
    `${INVOICES_URL}/statistics/timeline${query ? `?${query}` : ""}`,
    { cache: "no-store", signal }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to load invoice timeline (HTTP ${res.status} ${res.statusText}).`
    );
  }

  return (await res.json()) as TaxTimeline;
}

/**
 * Fetch the individual invoices in a date window
 * (GET /api/v1/invoices/statistics/details?from&to) — backs the per-month drill-down table.
 */
export async function fetchInvoiceDetails(
  from: string | null,
  to: string | null,
  signal?: AbortSignal
): Promise<InvoiceLineItem[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const res = await apiFetch(
    `${INVOICES_URL}/statistics/details${query ? `?${query}` : ""}`,
    { cache: "no-store", signal }
  );

  if (!res.ok) {
    throw new Error(await describeError(res, "tải chi tiết hóa đơn"));
  }

  return (await res.json()) as InvoiceLineItem[];
}

/**
 * Persist accountant corrections via a partial update
 * (PATCH /api/v1/invoices/{id}).
 *
 * PATCH (not PUT) is used deliberately: the backend's PUT has full-replacement
 * semantics and rejects a body that omits required fields (vendorName,
 * netAmount, grossAmount, ...) with a 400. Since the review dialog only edits a
 * few fields, PATCH applies just the supplied values and leaves the rest
 * untouched.
 *
 * The backend re-runs its math/format validation and recomputes
 * `requiresManualReview` itself — the flag is server-owned and must NOT be sent
 * in the request body (the update DTO has no such field). The corrected, fully
 * re-validated entity is returned.
 */
export async function updateInvoice(
  id: number,
  changes: EditableInvoiceFields
): Promise<Invoice> {
  const res = await apiFetch(`${INVOICES_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });

  if (!res.ok) {
    throw new Error(`Failed to save invoice #${id} (HTTP ${res.status}).`);
  }

  return (await res.json()) as Invoice;
}

/**
 * Transition an invoice's approval status (PATCH /api/v1/invoices/{id}/status).
 * Mirrors `revenueApi.updateRevenueStatus`. The backend refuses `APPROVED` with
 * **409** when the invoice still needs review (`requiresManualReview === true`);
 * `describeError` surfaces that message. Returns the updated invoice.
 */
export async function updateInvoiceStatus(
  id: number,
  status: DocumentStatus
): Promise<Invoice> {
  const res = await apiFetch(`${INVOICES_URL}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error(await describeError(res, `update status of invoice #${id}`));
  }

  return (await res.json()) as Invoice;
}

/**
 * Upload a PDF/JPEG/PNG invoice for AI extraction
 * (POST /api/v1/invoices/extract).
 *
 * This is the human-in-the-loop step: the backend runs Azure OCR + GPT-4o and
 * returns the structured invoice WITHOUT persisting it. The caller reviews /
 * corrects the result, then calls `createInvoice` to save.
 */
export async function extractInvoice(file: File): Promise<Invoice> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch(`${INVOICES_URL}/extract`, {
    method: "POST",
    body: form, // browser sets the multipart boundary; do not set Content-Type
  });

  if (!res.ok) {
    throw new Error(await describeError(res, "extract invoice"));
  }

  return (await res.json()) as Invoice;
}

/**
 * Queue multiple invoice files for asynchronous extraction
 * (POST /api/v1/invoices/extract/batch). Returns immediately (HTTP 202); the
 * backend processes each file via RabbitMQ and persists the results, flagging
 * any that fail validation with `requiresManualReview`.
 */
export async function extractInvoiceBatch(
  files: File[]
): Promise<BatchAcceptedResponse> {
  const form = new FormData();
  for (const f of files) form.append("files", f);

  const res = await apiFetch(`${INVOICES_URL}/extract/batch`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await describeError(res, "queue invoice batch"));
  }

  return (await res.json()) as BatchAcceptedResponse;
}

/**
 * Persist a human-verified invoice (POST /api/v1/invoices). Returns the saved
 * entity (with its new id and server-computed `requiresManualReview`).
 */
export async function createInvoice(
  payload: InvoiceCreateRequest
): Promise<Invoice> {
  const res = await apiFetch(INVOICES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await describeError(res, "save invoice"));
  }

  return (await res.json()) as Invoice;
}

/**
 * Build a readable error message from a failed response, surfacing the backend's
 * `ErrorResponse` details (message + field-level validation) when present.
 */
export async function describeError(
  res: Response,
  action: string
): Promise<string> {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.message ?? "";
    if (Array.isArray(body?.details) && body.details.length > 0) {
      detail += ` (${body.details.join("; ")})`;
    }
  } catch {
    /* non-JSON body */
  }
  return `Could not ${action} (HTTP ${res.status}).${detail ? " " + detail : ""}`;
}
