import type {
  EditableInvoiceFields,
  Invoice,
  InvoiceCreateRequest,
  InvoiceTaxStatistics,
} from "@/types/invoice";
import type { BatchAcceptedResponse } from "@/types/common";

/**
 * Base URL for API calls.
 *
 * Defaults to "" (empty) so the browser issues *same-origin* requests to
 * `/api/v1/...`, which the Next.js rewrite proxy (see next.config.ts) forwards
 * to the Spring Boot backend server-side — no CORS required.
 *
 * Set `NEXT_PUBLIC_API_BASE_URL` (e.g. http://localhost:8080) to bypass the
 * proxy and call the backend directly instead. The REST base path is
 * `/api/v1/invoices` (confirmed against the backend `InvoiceController`).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const INVOICES_URL = `${API_BASE_URL}/api/v1/invoices`;

/**
 * Fetch every invoice from the backend.
 *
 * Throws on a non-2xx response so callers can render a dedicated error state.
 * `cache: "no-store"` keeps the review queue fresh on every load.
 */
export async function fetchInvoices(signal?: AbortSignal): Promise<Invoice[]> {
  const res = await fetch(INVOICES_URL, { cache: "no-store", signal });

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

  const res = await fetch(
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
  const res = await fetch(`${INVOICES_URL}/${id}`, {
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

  const res = await fetch(`${INVOICES_URL}/extract`, {
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

  const res = await fetch(`${INVOICES_URL}/extract/batch`, {
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
  const res = await fetch(INVOICES_URL, {
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
