@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Read `AGENTS.md` first (imported above).** This is **not** the Next.js in your training
> data — APIs, conventions, and file structure may differ. Before writing code, read the
> relevant guide under `node_modules/next/dist/docs/` and heed deprecation notices.

The **VietFinance** frontend: an accountant-facing "Approval Station" for AI-extracted German
restaurant invoices (Rechnungen) and POS revenue reports (Z-Bons). It is a thin review/correction
UI over the Spring Boot backend in `../viet-finance`.

## Stack

- **Next.js 16.2.6** (App Router, React Server Components enabled) + **React 19.2.4**
- **TypeScript 5**, strict; path alias `@/*` → `src/*`
- **Tailwind CSS v4** (`@tailwindcss/postcss`; no `tailwind.config` — config lives in
  `src/app/globals.css` via CSS variables)
- **shadcn/ui** (`new-york` style, `rsc: true`, `neutral` base) + **Radix UI** primitives;
  **lucide-react** icons. Generated primitives live in `src/components/ui/`.
- `clsx` + `tailwind-merge` via the `cn()` helper (`src/lib/utils.ts`)

## Build & Run

```bash
npm run dev      # next dev — http://localhost:3000
npm run build    # next build
npm run start    # serve the production build
npm run lint     # eslint (flat config, eslint-config-next)
```

The backend (`../viet-finance`) must be running on `http://localhost:8080` for data to load
(start its infra with `docker compose up -d`, then run the Spring Boot app in the IDE).

## Backend Connection — same-origin proxy (no CORS)

The browser only ever calls `/api/*` on the Next.js origin. `next.config.ts` `rewrites()` forwards
`/api/:path*` to the Spring Boot backend **server-side**, so the cross-origin hop is server-to-server
and the backend needs no CORS config.

- **`BACKEND_URL`** (server-only env, defaults to `http://localhost:8080`) — the proxy target.
  Not `NEXT_PUBLIC_*`, so it never ships to the browser.
- **`NEXT_PUBLIC_API_BASE_URL`** (`src/lib/api.ts`, defaults to `""`) — set this to call the backend
  directly and bypass the proxy. Leave empty to use same-origin requests through the rewrite.

## Structure

```
src/
  app/                       # App Router
    page.tsx                 # "/"  — Invoice approval queue (dashboard + KPI cards)
    invoices/scan/page.tsx   # "/invoices/scan"  — upload & extract invoices
    revenues/page.tsx        # "/revenues"       — revenue reports dashboard
    revenues/scan/page.tsx   # "/revenues/scan"  — upload & extract Z-Bons
    layout.tsx, globals.css
  components/
    invoices/  revenues/     # *Table + *ReviewDialog per domain
    upload/                  # FileDropzone, BatchUpload, ScanModeTabs
    layout/Sidebar.tsx       # nav (Invoices / Revenue sections)
    forms/LabeledInput.tsx
    StatusBadge.tsx
    ui/                      # shadcn/ui primitives — regenerate, don't hand-edit
  lib/
    api.ts                   # invoice REST client + shared describeError()
    revenueApi.ts            # revenue REST client (reuses api.ts helpers)
    utils.ts                 # cn(), formatCurrency, formatDate
  types/                     # invoice.ts, revenue.ts, common.ts, page.ts
```

All pages are Client Components (`"use client"`) that fetch on mount with an `AbortController`,
holding data in `useState`. There is no global store or data-fetching library.

## API layer & the human-in-the-loop flow

`src/lib/api.ts` (invoices) and `src/lib/revenueApi.ts` (revenues) wrap `fetch`. Both mirror the
same backend pattern:

1. **Extract** (`POST .../extract`, multipart) → returns the structured entity **without persisting**
   (backend runs Azure OCR + the LLM parse). Let the browser set the multipart boundary — never set
   `Content-Type` manually on `FormData`.
2. **Review / correct** in the `*ReviewDialog`.
3. **Create** (`POST .../`) to persist the human-verified entity; the response carries the new `id`
   and the server-computed `requiresManualReview`.

Other operations:
- **List:** `fetchInvoices()` (`GET /api/v1/invoices`, plain array, `cache: "no-store"`);
  `fetchRevenues()` (`GET /api/v1/revenues?size=200&sort=id,desc`, Spring `Page` → returns `.content`).
- **Partial update:** `PATCH .../{id}` with only the edited fields. **PATCH, not PUT** — the backend's
  PUT is full-replacement and 400s on a body missing required fields. The backend re-runs its math
  validation and recomputes `requiresManualReview` itself; **never send that flag** in the body.
- **Batch:** `POST .../extract/batch` (multipart, field name `files`) → `202 Accepted` immediately;
  the backend processes asynchronously via RabbitMQ.
- **Errors:** `describeError()` surfaces the backend `ErrorResponse` (`message` + `details[]`).

`requiresManualReview` is the **critical UI flag** (red highlighting, "Requires Review" KPI, the
invoice table's Review column). It is server-owned — the UI only reads it. Saving corrected figures
lets the backend re-validate and clear the flag.

Backend response shape note: the backend serializes with `@JsonInclude(NON_NULL)`, so nullable fields
are **omitted** (arrive as `undefined`, not `null`). Formatters (`formatCurrency`/`formatDate`) and
`?? fallback` reads treat absent / null / NaN uniformly.

## Invoice vs. Revenue: approval workflow asymmetry

The backend's **Invoice** module was simplified (KISS): it has **no** SEPA/compliance fields and **no
approval workflow** — invoices carry no `status`, and there is no `PATCH /api/v1/invoices/{id}/status`
endpoint or `?status=` filter. See `../viet-finance/CLAUDE.md`. The frontend Invoice layer is
reconciled to this:
- `types/invoice.ts` mirrors only the backend `InvoiceResponse` fields; `InvoiceCreateRequest` sends
  only what `InvoiceCreationRequest` accepts.
- Invoices are corrected via `PATCH /api/v1/invoices/{id}` (`api.ts#updateInvoice`) — Save only,
  **no approve action**. `EditableInvoiceFields` covers the figures the math check depends on, so a
  reviewer can reconcile a flagged invoice and have the backend clear `requiresManualReview`.

**Revenue keeps the full approval workflow.** `revenueApi.ts#updateRevenueStatus` →
`PATCH /api/v1/revenues/{id}/status`; moving to `APPROVED` requires the stored figures to reconcile,
else **409**. `RevenueReviewDialog` has both Save and Approve. The shared `DocumentStatus` type lives
in `types/common.ts` (it is a Revenue-only concept) and `StatusBadge` is used only by `RevenueTable`.

**Forensic accounting fields (Full Audit Extraction).** `RevenueReport` carries four backend audit
fields: `cashExpenses` (Barausgabe) and `staffTips` (Trinkgeldauszahlung) are NOT-NULL cash-outs;
`discrepancyAmount` is the **Java-reconciled** genuinely-unaccounted amount (0/absent = reconciled,
non-zero ⇒ `requiresManualReview`); `accountingNotes` is the explanation. `RevenueReviewDialog` shows
a read-only **"Reconciliation & Expenses"** grid (the Discrepancy tile turns **red** when
`discrepancyAmount !== 0`, green when reconciled) plus an **editable** "Accounting Notes" `<textarea>`.
Only `accountingNotes` is editable — it is in `EditableRevenueFields` and **always** sent in the
PATCH body (`collect()`); the three figures are server-owned and never sent back. The backend
`RevenueUpdateRequestDTO` accepts `accountingNotes` (PATCH coalesces, PUT replaces) and preserves the
AI-extracted `cashExpenses`/`staffTips` across edits while re-reconciling `discrepancyAmount` itself —
so editing the note never disturbs the cash-outs.

**Revenue report period (V12).** `RevenueReport` carries `reportStartDate` / `reportEndDate` (ISO
`yyyy-MM-dd`, nullable → may arrive `undefined`) for aggregated Z-Reports, distinct from `reportDate`
(generation/print date). `RevenueReviewDialog`'s `periodLabel(report)` renders the header date: one
date when `start === end` (daily Z-Bon), `"start - end"` when they differ (monthly/weekly aggregate),
falling back to `reportDate` when the period is absent. Display-only — the dates aren't edited in the UI.

When changing either domain's contract, keep `types/*` and the matching `lib/*Api.ts` in lockstep
with the backend DTOs/endpoints — the two domains intentionally differ, so don't copy one onto the
other.

## Localization (Vietnamese UI)

The UI is being localized to **pure Vietnamese**. Localized so far: the whole **Revenue** surface
(`RevenueReviewDialog`, `RevenueTable`, `revenues/page.tsx` dashboard), **both scan pages**
(`invoices/scan/page.tsx`, `revenues/scan/page.tsx`), the shared **upload** components
(`upload/ScanModeTabs`, `upload/FileDropzone`, `upload/BatchUpload`), and `StatusBadge`. **Still
English:** the invoice home / review queue (`app/page.tsx`), the invoice table, and `layout/Sidebar.tsx`.

**Hard rule — display text ONLY.** Translate JSX text, `label=` / `placeholder=` / `aria-label=`
values, section headings, button labels, and user-facing error/validation strings. **NEVER** touch
data or logic: `id=`, `value=`, `onChange={set("…")}`, form-state keys, component prop names, `types/*`
fields, or API values. The approval `status` in particular stays the raw backend string
(`PENDING`/`APPROVED`/`REJECTED`) — `StatusBadge` maps it to a Vietnamese label for *display* via
`statusLabel()`, while `statusVariant()` and the value sent to `PATCH /status` keep the raw English.

**Shared-component caveat:** the three `upload/*` components render on BOTH scan pages, so translating
them affects invoice and revenue alike — keep both scan pages localized together to avoid a mixed page.

**Terminology** (keep consistent — full glossary in `.claude-knowledge.md`): Chi nhánh (store), Mã báo
cáo (report no.), Doanh thu thuần (net revenue), Tổng doanh thu (gross revenue), Tổng thuế (tax total),
Phương thức thanh toán, Tiền mặt / Thẻ EC / Thẻ tín dụng / Ghi nợ (on account), Đối soát & Chi phí,
Chênh lệch (discrepancy), Ghi chú Kế toán. ⚠️ **Invoices are bills, not revenue** — the invoice scan
page uses **Tiền chưa thuế** (net) / **Tổng tiền** (gross), NOT the revenue "Doanh thu" terms. Kept
as-is (technical/proper nouns): `POS`, `PayPal`, `Voucher`, `Z-Bon / TSE`, `EUR`, `ID`.

**No i18n layer (yet):** strings are hardcoded in JSX (no `next-intl`/catalog). With the app trending
Vietnamese-default, prefer extracting strings into an i18n catalog over more hand-swaps when a language
toggle or the remaining English surfaces come into scope. Backend-originated strings (`describeError()`
messages, `BatchAcceptedResponse.message`) stay English — they are not localized client-side.

## Conventions

- Use the `@/` alias, not deep relative paths. Compose classes with `cn()`.
- Add shadcn primitives via the CLI into `src/components/ui/`; don't hand-edit generated files.
- Keep all REST calls in `lib/api.ts` / `lib/revenueApi.ts` — components import these functions
  rather than calling `fetch` directly.
- Domain types in `src/types/*` mirror the backend DTOs; keep them in sync when the backend contract
  changes (see the Invoice vs. Revenue section above — the two domains intentionally differ).
- **Localization:** translate display text only — never binding keys, props, or API values (see the
  Localization section). Reuse the established Vietnamese terms; full glossary in `.claude-knowledge.md`.
