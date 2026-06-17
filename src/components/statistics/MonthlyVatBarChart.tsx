"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/utils";
import type { VatCalculation } from "@/types/tax";

const COLORS = {
  output: "#0ea5e9", // sky-500 — thuế đầu ra
  input: "#f59e0b", // amber-500 — thuế đầu vào
  payable: "#6366f1", // indigo-500 — phải nộp (Zahllast)
};

/** EUR rút gọn cho trục Y (vd "1,2k €"); giá trị đầy đủ hiện ở tooltip. */
const compactEur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Nhãn cột "MM/YY" từ `periodStart` (ISO yyyy-MM-dd); fallback periodLabel khi vắng. */
function axisLabel(c: VatCalculation): string {
  if (c.periodStart) {
    const [y, m] = c.periodStart.split("-");
    return `${m}/${y.slice(2)}`;
  }
  return c.periodLabel;
}

interface MonthlyVatBarChartProps {
  /** Chuỗi Zahllast theo từng tháng (liên tục, vắt qua năm). */
  data: VatCalculation[];
  /** Gọi khi bấm vào cột một tháng — mở drill-down cho tháng đó. */
  onSelectMonth?: (point: VatCalculation) => void;
}

/**
 * Biểu đồ cột Zahllast theo dòng thời gian tháng (liên tục): mỗi tháng 3 cột — Thuế đầu ra,
 * Thuế đầu vào, Phải nộp. Cột "Phải nộp" có thể âm (được hoàn) nên có đường tham chiếu y=0.
 * Bấm vào cột để mở drill-down chi tiết tháng.
 */
export function MonthlyVatBarChart({ data, onSelectMonth }: MonthlyVatBarChartProps) {
  const chartData = data.map((c) => ({
    name: axisLabel(c),
    "Thuế đầu ra": c.totalOutputTax,
    "Thuế đầu vào": c.totalInputTax,
    "Phải nộp": c.totalVatPayable,
  }));

  const handleBarClick = (_: unknown, index: number) => {
    const point = data[index];
    if (point && onSelectMonth) onSelectMonth(point);
  };

  const cursor = onSelectMonth ? "pointer" : "default";

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
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Thuế đầu ra" fill={COLORS.output} radius={[3, 3, 0, 0]} onClick={handleBarClick} style={{ cursor }} />
          <Bar dataKey="Thuế đầu vào" fill={COLORS.input} radius={[3, 3, 0, 0]} onClick={handleBarClick} style={{ cursor }} />
          <Bar dataKey="Phải nộp" fill={COLORS.payable} radius={[3, 3, 0, 0]} onClick={handleBarClick} style={{ cursor }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
