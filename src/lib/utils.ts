import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names while de-duplicating conflicting Tailwind
 * utilities. Standard shadcn/ui helper used by every UI primitive.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as German-locale Euro currency.
 *
 * Example: 1043.65 -> "1.043,65 €"
 *
 * Uses Intl with the "de-DE" locale and the EUR currency code so the grouping
 * separator (.), decimal separator (,) and trailing symbol all match German
 * accounting conventions. null / undefined / NaN degrade gracefully to "—".
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format an ISO date string (or null) into the German short date format
 * (DD.MM.YYYY). Returns "—" when the value is missing or unparseable.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
