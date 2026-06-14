"use client";

import * as React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatCurrency } from "@/lib/utils";

const COLORS = {
  tax7: "#0ea5e9", // sky-500
  tax19: "#6366f1", // indigo-500
};

interface TaxDistributionPieChartProps {
  tax7: number;
  tax19: number;
}

/**
 * Donut chart showing the share of 7% vs 19% tax over the selected period.
 * Renders an empty-state message when there is no tax in the window.
 */
export function TaxDistributionPieChart({ tax7, tax19 }: TaxDistributionPieChartProps) {
  const total = tax7 + tax19;

  if (total <= 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
        Không có dữ liệu thuế trong kỳ đã chọn.
      </div>
    );
  }

  const data = [
    { name: "Thuế 7%", value: tax7 },
    { name: "Thuế 19%", value: tax19 },
  ];

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
          >
            <Cell fill={COLORS.tax7} />
            <Cell fill={COLORS.tax19} />
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
