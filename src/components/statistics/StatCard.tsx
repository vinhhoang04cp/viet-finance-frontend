"use client";

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
  accent?: "default" | "primary";
}

/**
 * Large overview KPI card for the dashboard. Title on top, big tabular-nums value
 * beneath; a skeleton replaces the value while `loading`.
 */
export function StatCard({
  title,
  value,
  icon,
  loading = false,
  accent = "default",
}: StatCardProps) {
  return (
    <Card className={cn(accent === "primary" && "border-primary/30 bg-primary/5")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <span className="block h-9 w-28 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
