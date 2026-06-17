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

## Authentication & multi-tenant session

The app is gated behind login (backend Phase 2 — every business endpoint requires a tenant-scoped JWT).
Session state lives in **`AuthProvider`** (`lib/auth/AuthContext`, exposed via `useAuth()`):
`user`, `tenants`, `currentTenant`, `role`, `canWrite` (OWNER/ACCOUNTANT — VIEWER is read-only),
`isAuthenticated`, `isLoading`, and actions (`login`, `register`, `loginWithGoogle`, `completeOAuthCode`,
`selectTenant`, `switchTenant`, `createTenant`, `logout`, `refreshProfile`).

- **Token model (hybrid).** Access token (short-lived JWT) is kept in `localStorage` (`lib/auth/storage`)
  and sent as `Authorization: Bearer`. The **refresh token is an httpOnly cookie set by the backend** —
  JS can't read it; `refreshTokens()` POSTs `/auth/refresh` with **no body** (`credentials: "same-origin"`)
  and the browser sends the cookie. `lib/auth/jwt.ts` decodes the JWT client-side (no verification — just
  to read `tid`/`role`/`exp`); the backend verifies on every request.
- **`apiFetch` (`lib/apiFetch.ts`) is the central authed fetch** for all business calls (Invoice/Revenue/
  Tax/Users/Tenants). It attaches the Bearer header, and on a **401 refreshes once** — concurrent 401s are
  queued so only one `/auth/refresh` fires, then the original requests retry. If refresh fails it clears the
  token and dispatches the `vf:auth-expired` window event; `AuthProvider` listens, resets state, and
  redirects to `/auth/login?returnUrl=…`. Auth endpoints themselves (`authApi.ts`) call `fetch` directly,
  not `apiFetch` (no Bearer / no refresh loop).
- **Multi-tenant login flow.** `login` → if `tenantSelectionRequired`, a **temp token** (no `tid`) is stored
  and `{type:"selectTenant", options}` returned → user picks a restaurant (`TenantSelector`) → `selectTenant`
  → full tokens. Single-tenant → straight in. **OAuth2:** `loginWithGoogle` redirects to the backend
  authorize URL (NOT through the proxy — uses `NEXT_PUBLIC_BACKEND_URL`); the backend redirects back to
  `/auth/callback?code=…`, which calls `completeOAuthCode` → `{success | selectTenant | noTenant}`. A Google
  user with **no** tenant (`noTenant`) lands on `/onboarding` to create one. `switchTenant` re-selects a
  tenant then hard-reloads `/` (no global cache to clear) with a flash toast.
- **Route gating (`AppShell` + `RequireAuth`).** `AppShell` (in `layout.tsx`) picks layout by route:
  `/auth/*` → full-screen public; `/onboarding` → `RequireAuth requireTenant={false}` (authed, tenant not
  required); everything else → `RequireAuth` (authed **+** tenant) wrapped in `Sidebar` + `Navbar`.
  `RequireAuth` is a **client guard** (the token is in localStorage, invisible to Next middleware): not
  authed → `/auth/login`; authed but no tenant → `/onboarding`. `Navbar` has the tenant switcher + user
  menu (profile / settings / logout); write-only nav items (Scan) are hidden unless `canWrite`.
- **Settings (`/settings/*`, `lib/settingsApi.ts`):** profile + change-password (`/users/me`(+`/password`)),
  restaurant (`/tenants/{id}`), and members (`/tenants/{id}/members`, OWNER-gated). Roles render via
  `ROLE_LABELS` (`types/auth.ts`).

## Structure

```
src/
  app/                       # App Router
    page.tsx                 # "/"  — Invoice approval queue (dashboard + KPI cards)
    dashboard/page.tsx       # "/dashboard" — tax statistics (charts + monthly table)
    tax/page.tsx             # "/tax"        — VAT / Zahllast (output − input) + Excel export
    invoices/scan/page.tsx   # "/invoices/scan"  — upload & extract invoices
    revenues/page.tsx        # "/revenues"       — revenue reports dashboard
    revenues/scan/page.tsx   # "/revenues/scan"  — upload & extract Z-Bons
    auth/{login,register,callback}/page.tsx   # public — sign-in / sign-up / OAuth2 code exchange
    onboarding/page.tsx      # "/onboarding" — create first restaurant (authed, no tenant yet)
    settings/{profile,restaurant,members}/page.tsx
    layout.tsx, globals.css  # layout wraps <AuthProvider><AppShell>; <Toaster/> (sonner)
  components/
    invoices/  revenues/     # *Table + *ReviewDialog per domain
    upload/                  # FileDropzone, BatchUpload, ScanModeTabs
    auth/                    # RequireAuth, AuthCard, GoogleButton, TenantSelector, AccessDenied
    layout/                  # AppShell (route→layout), Sidebar (nav), Navbar (tenant switch + user menu)
    statistics/             # StatCard, MonthlyTaxBarChart, MonthlyVatBarChart (both clickable), TaxDistributionPieChart, MonthlyTaxTable, TaxSummaryBar, LineItemsTables (drill-down)
    filters/PeriodFilter.tsx
    forms/LabeledInput.tsx
    StatusBadge.tsx
    ui/                      # shadcn/ui primitives — regenerate, don't hand-edit (incl. dropdown-menu, sonner)
  lib/
    api.ts                   # invoice REST client + shared describeError() + statistics; re-exports API_BASE_URL
    revenueApi.ts            # revenue REST client + statistics (reuses api.ts helpers)
    taxApi.ts                # tax/Zahllast client + Excel download (Bearer via apiFetch)
    settingsApi.ts           # profile / password / tenant / member management
    apiFetch.ts              # central authed fetch — attaches Bearer, auto-refreshes on 401
    config.ts                # API_BASE_URL (no imports → avoids cycles)
    auth/                    # AuthContext (provider+useAuth), authApi, jwt (decode), storage (token)
    period.ts  statistics.ts # period→range + monthly merge/sum helpers for the dashboards
    utils.ts                 # cn(), formatCurrency, formatDate
  types/                     # invoice.ts, revenue.ts, common.ts, page.ts, auth.ts, tax.ts, statistics.ts
```

Most pages are Client Components (`"use client"`) that fetch on mount with an `AbortController`,
holding data in `useState`. The **one** global store is `AuthProvider` (React Context, `lib/auth/AuthContext`)
holding the session (user, tenants, current tenant, role); there is no data-fetching library.

## API layer & the human-in-the-loop flow

`src/lib/api.ts` (invoices) and `src/lib/revenueApi.ts` (revenues) are the domain REST clients
(`taxApi.ts` + `settingsApi.ts` join them). All business calls go through **`apiFetch`** (Bearer +
auto-refresh — see Authentication above), not raw `fetch`. Both mirror the same backend pattern:

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

## Tax & statistics dashboards

Two read-only analytics pages, both reusing `components/statistics/*` (`StatCard`, charts, tables) and the
`components/filters/PeriodFilter` + `lib/period.ts` (`periodToRange`, `availableYears`) helpers.

- **`/dashboard` — tax statistics (rolling timeline + drill-down).** Merges the two modules' **continuous
  timeline** (`fetchInvoiceTimeline` from `api.ts`, `fetchRevenueTimeline` from `revenueApi.ts`, both
  `GET …/statistics/timeline?from&to[&status]`) into one `TimelinePoint[]` (`types/statistics.ts`) via
  `mergeTimeline`. Filters: module (all/invoice/revenue), status, and a **range** selector (`TIMELINE_RANGES`
  = 6/12/24 months; default 12) → `recentRange(months)` computes the rolling `{from,to}`. Renders the
  (clickable) `MonthlyTaxBarChart`, `TaxDistributionPieChart`, `MonthlyTaxTable`; totals via `sumTimeline`.
- **`/tax` — VAT / Zahllast (period summary + timeline + drill-down).** Keeps the `PeriodFilter`-driven
  Zahllast summary (`fetchVatCalculation`) and adds a rolling **timeline** chart (`fetchVatTimeline`,
  `MonthlyVatBarChart`, own range selector); `downloadTaxExcel` (`/tax/export`). `VatCalculation`
  (`types/tax.ts`) mirrors the backend record: output − input tax split 7%/19%, `totalVatPayable` +
  `VatStatus` (`PAYABLE`/`REFUNDABLE`/`BALANCED`). **`status` defaults to `APPROVED`** (official Zahllast);
  the page exposes it as a filter (APPROVED = chính thức, PENDING = ước tính).
- **Per-month drill-down (both pages).** Clicking a bar (`onSelectMonth`) or a `MonthlyTaxTable` row opens
  a detail panel that fetches that month's rows — `fetchInvoice/RevenueDetails` (dashboard, by module) or
  `fetchVatDetails` (tax, both sides) — and renders `InvoiceLineItemsTable` / `RevenueLineItemsTable`
  (`components/statistics/LineItemsTables.tsx`). The selected month → its `{from,to}` via `monthRangeOf`
  (dashboard) or the point's own `periodStart`/`periodEnd` (tax). `MonthlyTaxStatistics`/`mergeMonthly`/
  `emptyMonthly` (the old year-bucketed `/monthly` helpers) remain in `lib/statistics.ts` but the
  dashboards now use the timeline variants.
- **Excel download caveat.** The export needs a `Bearer` header, so it can't be a plain `<a download>` —
  `downloadTaxExcel` fetches through `apiFetch` (carrying auth), reads the blob, parses the filename from
  `Content-Disposition` (prefers `filename*=UTF-8''…`), and triggers download via an object URL.

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
- Keep all REST calls in the `lib/*Api.ts` clients (`api.ts` / `revenueApi.ts` / `taxApi.ts` /
  `settingsApi.ts` / `auth/authApi.ts`) — components import these functions rather than calling `fetch`
  directly. Business clients fetch via `apiFetch` (auth + refresh); only `authApi.ts` uses raw `fetch`.
- Domain types in `src/types/*` mirror the backend DTOs; keep them in sync when the backend contract
  changes (see the Invoice vs. Revenue section above — the two domains intentionally differ).
- **Localization:** translate display text only — never binding keys, props, or API values (see the
  Localization section). Reuse the established Vietnamese terms; full glossary in `.claude-knowledge.md`.
