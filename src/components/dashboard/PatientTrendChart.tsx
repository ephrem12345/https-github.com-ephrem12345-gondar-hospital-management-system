"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/types";
import { useTheme } from "@/lib/theme/ThemeProvider";

export function PatientTrendChart({
  data,
  labels,
}: {
  data: TrendPoint[];
  labels: { admitted: string; discharged: string; yAxis: string };
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const grid = dark ? "#1E2F49" : "#EEF2F7";
  const axis = dark ? "#64748B" : "#94A3B8";
  const tooltipBg = dark ? "#101E33" : "#FFFFFF";
  const tooltipBorder = dark ? "#1E2F49" : "#E2E8F0";
  const tooltipText = dark ? "#CBD5E1" : "#334155";

  return (
    <div className="h-72 w-full" role="img" aria-label={labels.admitted}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="fillAdmitted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1565C0" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1565C0" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillDischarged" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: axis, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: axis, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={44}
            label={{
              value: labels.yAxis,
              angle: -90,
              position: "insideLeft",
              fill: axis,
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 12,
              color: tooltipText,
              fontSize: 13,
              boxShadow: "0 12px 24px rgba(16,24,40,0.14)",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: axis }}
          />
          <Area
            type="monotone"
            dataKey="admitted"
            name={labels.admitted}
            stroke="#1565C0"
            strokeWidth={2}
            fill="url(#fillAdmitted)"
          />
          <Area
            type="monotone"
            dataKey="discharged"
            name={labels.discharged}
            stroke="#16A34A"
            strokeWidth={2}
            fill="url(#fillDischarged)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
