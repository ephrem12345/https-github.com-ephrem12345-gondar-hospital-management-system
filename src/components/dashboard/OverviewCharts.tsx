"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import type { DashboardDataBundle } from "@/services";
import { formatCurrency } from "@/lib/utils/formatters";

export interface PrimaryOverviewChartsProps {
  chartMetrics: Array<{
    label: string;
    visits: number;
    admissions: number;
    registrations: number;
  }>;
  patientMixData: Array<{ name: string; value: number }>;
  departmentMix: Array<{ name: string; value: number }>;
}

export function PrimaryOverviewCharts({
  chartMetrics,
  patientMixData,
  departmentMix,
}: PrimaryOverviewChartsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card flush>
        <CardHeader
          title="Patient statistics"
          subtitle="Daily visits, admissions and registrations"
        />
        <div className="h-80 px-4 pb-4 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" name="Visits" fill="#2563eb" radius={[8, 8, 0, 0]} />
              <Line
                type="monotone"
                dataKey="admissions"
                name="Admissions"
                stroke="#16a34a"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="registrations"
                name="Registrations"
                stroke="#f59e0b"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card flush>
        <CardHeader title="Department statistics" subtitle="Volume by service line" />
        <div className="h-80 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={patientMixData.length ? patientMixData : departmentMix}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
              >
                {departmentMix.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={
                      [
                        "#2563eb",
                        "#14b8a6",
                        "#f59e0b",
                        "#8b5cf6",
                        "#ef4444",
                        "#94a3b8",
                      ][index % 6]
                    }
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, "Share"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            {(patientMixData.length ? patientMixData : departmentMix).map((entry, index) => (
              <span
                key={entry.name}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: [
                      "#2563eb",
                      "#14b8a6",
                      "#f59e0b",
                      "#8b5cf6",
                      "#ef4444",
                      "#94a3b8",
                    ][index % 6],
                  }}
                />
                {entry.name}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export interface SecondaryOverviewChartsProps {
  appointmentBreakdown: DashboardDataBundle["appointmentBreakdown"];
  financialTrend: DashboardDataBundle["financialTrend"];
  occupancyTrend: DashboardDataBundle["occupancyTrend"];
}

export function SecondaryOverviewCharts({
  appointmentBreakdown,
  financialTrend,
  occupancyTrend,
}: SecondaryOverviewChartsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card flush>
        <CardHeader
          title="Appointment statistics"
          subtitle="Scheduled, completed, cancelled and no-shows"
        />
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={appointmentBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="scheduled" stackId="a" fill="#2563eb" />
              <Bar dataKey="completed" stackId="a" fill="#16a34a" />
              <Bar dataKey="cancelled" stackId="a" fill="#f59e0b" />
              <Bar dataKey="noShow" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card flush>
        <CardHeader title="Financial statistics" subtitle="Revenue vs target" />
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={financialTrend}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                fill="url(#revenueFill)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card flush>
        <CardHeader
          title="Bed occupancy"
          subtitle="Available, occupied, reserved and maintenance"
        />
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={occupancyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="available" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="occupied" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reserved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="maintenance" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export interface LabOverviewChartProps {
  labTrend: DashboardDataBundle["labTrend"];
}

export function LabOverviewChart({ labTrend }: LabOverviewChartProps) {
  return (
    <Card flush>
      <CardHeader
        title="Laboratory statistics"
        subtitle="Pending, processing and completed tests"
      />
      <div className="h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={labTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="processing" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
