"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard, type StatCardProps } from "@/components/ui/StatCard";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { ChartConfig, AnalyticsScreen } from "@/modules/types";

const PIE_PALETTE = ["#1565C0", "#4D89DC", "#16A34A", "#F59E0B", "#7BA9E7", "#94A3B8", "#DC2626"];

function ChartBlock({ chart }: { chart: ChartConfig }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const grid = dark ? "#1E2F49" : "#EEF2F7";
  const axis = dark ? "#64748B" : "#94A3B8";
  const tooltipStyle = {
    backgroundColor: dark ? "#101E33" : "#FFFFFF",
    border: `1px solid ${dark ? "#1E2F49" : "#E2E8F0"}`,
    borderRadius: 12,
    color: dark ? "#CBD5E1" : "#334155",
    fontSize: 13,
    boxShadow: "0 12px 24px rgba(16,24,40,0.14)",
  };

  return (
    <Card flush className={chart.type === "pie" ? "" : "xl:col-span-2"}>
      <CardHeader title={chart.title} subtitle={chart.subtitle} />
      <div className="h-72 w-full p-4">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "pie" ? (
            <RechartsPieWrapper chart={chart} tooltipStyle={tooltipStyle} />
          ) : chart.type === "bar" ? (
            <BarChart data={chart.data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey={chart.xKey} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={tooltipStyle} />
              {chart.series.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={series.color}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              ))}
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: axis }} />
            </BarChart>
          ) : (
            <AreaChart data={chart.data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <defs>
                {chart.series.map((series) => (
                  <linearGradient key={series.key} id={`fill-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series.color} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={series.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis dataKey={chart.xKey} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={tooltipStyle} />
              {chart.series.map((series) => (
                <Area
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2}
                  fill={`url(#fill-${series.key})`}
                />
              ))}
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: axis }} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RechartsPieWrapper({
  chart,
  tooltipStyle,
}: {
  chart: Extract<ChartConfig, { type: "pie" }>;
  tooltipStyle: React.CSSProperties;
}) {
  return (
    <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
      <Pie
        data={chart.data}
        dataKey="value"
        nameKey="name"
        innerRadius="55%"
        outerRadius="80%"
        paddingAngle={2}
        strokeWidth={0}
      >
        {chart.data.map((entry, index) => (
          <Cell key={entry.name} fill={PIE_PALETTE[index % PIE_PALETTE.length]} />
        ))}
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
    </PieChart>
  );
}

/**
 * Analytics screen: KPI row plus a responsive grid of charts.
 */
export function AnalyticsTemplate({
  title,
  screen,
}: {
  title: string;
  screen: AnalyticsScreen;
}) {
  return (
    <>
      <PageHeader title={title} description={screen.description} />

      {screen.kpis ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {screen.kpis.map((kpi: StatCardProps) => (
            <StatCard key={kpi.label} {...kpi} />
          ))}
        </div>
      ) : null}

      <div className={screen.kpis ? "mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3" : "grid grid-cols-1 gap-4 xl:grid-cols-3"}>
        {screen.charts.map((chart) => (
          <ChartBlock key={chart.title} chart={chart} />
        ))}
      </div>
    </>
  );
}
