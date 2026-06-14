/**
 * Response body from the `POST /extract/batch` endpoints (HTTP 202).
 * Files are queued to RabbitMQ and processed asynchronously; results appear in
 * the dashboard later. Poll / refresh the list to observe them.
 */
export interface BatchAcceptedResponse {
  acceptedFiles: number;
  message: string;
}

/**
 * Approval status enum mirrored from the backend `DocumentStatus`.
 *
 * NOTE: this is a **Revenue-only** concept. The backend's Invoice module was
 * simplified (KISS) and no longer has an approval workflow — invoices carry no
 * status and expose no `/status` endpoint. Revenue reports default to `PENDING`;
 * `PATCH /api/v1/revenues/{id}/status` transitions them (moving to `APPROVED` is
 * only allowed server-side when the figures are mathematically valid).
 */
export type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";
