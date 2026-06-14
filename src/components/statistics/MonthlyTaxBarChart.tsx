"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/utils";
import { MONTH_SHORT_VI } from "@/lib/statistics";
import type { MonthlyTaxPoint } from "@/types/statistics";

const COLORS = {
  tax7: "#0ea5e9", // sky-500
  tax19: "#6366f1", // indigo-500
  total: "#94a3b8", // slate-400
};

/** Compact EUR for the Y axis (e.g. "1,2k €"); full value shown in the tooltip. */
const compactEur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

interface MonthlyTaxBarChartProps {
  data: MonthlyTaxPoint[];
}

/**
 * Grouped bar chart of tax by month: three bars per month — Thuế 7%, Thuế 19%,
 * Tổng thuế. X axis = month, Y axis = EUR.
 */
export function MonthlyTaxBarChart({ data }: MonthlyTaxBarChartProps) {
  const chartData = data.map((p) => ({
    name: MONTH_SHORT_VI[p.month - 1],
    "Thuế 7%": p.totalTax7,
    "Thuế 19%": p.totalTax19,
    "Tổng thuế": p.totalTax,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickFormatter={(v: number) => compactEur.format(v)}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={72}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Thuế 7%" fill={COLORS.tax7} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Thuế 19%" fill={COLORS.tax19} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Tổng thuế" fill={COLORS.total} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
