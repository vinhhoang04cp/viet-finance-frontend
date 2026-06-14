"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { availableYears, type Period } from "@/lib/period";

interface PeriodFilterLabels {
  /** Label for the "no year filter / everything" option. */
  all: string;
  /** Label for the "whole selected year" month option. */
  allMonths: string;
  /** 12 month names, index 0 = January. */
  months: string[];
}

const VI_LABELS: PeriodFilterLabels = {
  all: "Tất cả",
  allMonths: "Cả năm",
  months: [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ],
};

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
  /** Display labels — defaults to Vietnamese. Pass English on the invoice page. */
  labels?: PeriodFilterLabels;
  className?: string;
}

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Year + month period selector driving the list pages' summary bar (and reused
 * on the dashboard). Emits a {@link Period}; the caller converts it to an API
 * date range via `periodToRange`. When the year is "all" the month select is
 * disabled (the whole dataset is shown).
 */
export function PeriodFilter({
  value,
  onChange,
  labels = VI_LABELS,
  className,
}: PeriodFilterProps) {
  const years = React.useMemo(() => availableYears(), []);
  const yearIsAll = value.year === "all";

  function handleYear(raw: string) {
    if (raw === "all") {
      onChange({ year: "all", month: "all" });
    } else {
      onChange({ year: Number(raw), month: value.month });
    }
  }

  function handleMonth(raw: string) {
    if (value.year === "all") return; // month is meaningless without a year
    onChange({
      year: value.year,
      month: raw === "all" ? "all" : Number(raw),
    });
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <select
        className={SELECT_CLASS}
        value={yearIsAll ? "all" : String(value.year)}
        onChange={(e) => handleYear(e.target.value)}
        aria-label={labels.all}
      >
        <option value="all">{labels.all}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        className={SELECT_CLASS}
        value={value.month === "all" ? "all" : String(value.month)}
        onChange={(e) => handleMonth(e.target.value)}
        disabled={yearIsAll}
        aria-label={labels.allMonths}
      >
        <option value="all">{labels.allMonths}</option>
        {labels.months.map((name, idx) => (
          <option key={name} value={idx + 1}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

export { VI_LABELS as PERIOD_LABELS_VI };
export type { PeriodFilterLabels };
