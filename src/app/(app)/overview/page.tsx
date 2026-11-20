"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { canAccessRoute, getRoleDashboard } from "@/config/route-permissions";
import {
  Activity,
  ArrowRight,
  Banknote,
  CalendarCheck,
  CalendarRange,
  Download,
  FlaskConical,
  HeartPulse,
  Pill,
  RefreshCcw,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { dashboardService, authService, type DashboardDataBundle } from "@/services";
import type { DashboardActivityItem, DashboardAppointmentOverview } from "@/types";

const PrimaryOverviewCharts = dynamic(
  () => import("@/components/dashboard/OverviewCharts").then((mod) => mod.PrimaryOverviewCharts),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-card border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40" />
        <div className="h-80 animate-pulse rounded-card border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40" />
      </div>
    ),
  },
);

const SecondaryOverviewCharts = dynamic(
  () => import("@/components/dashboard/OverviewCharts").then((mod) => mod.SecondaryOverviewCharts),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="h-72 animate-pulse rounded-card border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40" />
        <div className="h-72 animate-pulse rounded-card border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40" />
        <div className="h-72 animate-pulse rounded-card border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40" />
      </div>
    ),
  },
);

const LabOverviewChart = dynamic(
  () => import("@/components/dashboard/OverviewCharts").then((mod) => mod.LabOverviewChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-card border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40" />
    ),
  },
);

const dateFilterOptions = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "last7days" },
  { label: "Last 30 days", value: "last30days" },
  { label: "This month", value: "thisMonth" },
  { label: "Custom range", value: "custom" },
] as const;

type LoadState = "loading" | "ready" | "error";
type RangePreset = (typeof dateFilterOptions)[number]["value"];

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

const quickIconMap: Record<string, LucideIcon> = {
  Users,
  CalendarCheck,
  Activity,
  HeartPulse,
  Stethoscope,
  FlaskConical,
  Pill,
  Banknote,
};

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<DashboardDataBundle | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedRange, setSelectedRange] = useState<RangePreset>("today");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-12");

  useEffect(() => {
    let cancelled = false;

    const user = authService.currentUser();
    if (user && !canAccessRoute("/overview", user.role)) {
      router.replace(getRoleDashboard(user.role));
      return;
    }

    setState("loading");
    dashboardService
      .getDashboardData()
      .then((bundle) => {
        if (cancelled) return;
        setData(bundle);
        setState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const currentUser = authService.currentUser() ?? {
    id: "usr-001",
    name: "Dr. Abebe Bekele",
    role: "Chief Administrator",
    department: "Administration",
    email: "abebe.bekele@gondar-hospital.et",
    phone: "+251 911 000 111",
    initials: "AB",
  };

  const dateLabel = useMemo(() => {
    if (selectedRange === "custom") {
      return `${formatDateLabel(new Date(startDate))} – ${formatDateLabel(new Date(endDate))}`;
    }
    if (selectedRange === "today") return "Today";
    if (selectedRange === "yesterday") return "Yesterday";
    if (selectedRange === "last7days") return "Last 7 days";
    if (selectedRange === "last30days") return "Last 30 days";
    return "This month";
  }, [selectedRange, startDate, endDate]);

  const summaryMetrics = useMemo(() => {
    if (!data?.summaryMetrics) return [];
    return data.summaryMetrics.map((metric) => ({
      ...metric,
      value:
        metric.id === "revenue"
          ? selectedRange === "custom"
            ? `ETB ${Math.round((Number(metric.value.replace(/[^0-9]/g, "")) || 1540000) * 1.06).toLocaleString()}`
            : metric.value
          : metric.value,
    }));
  }, [data, selectedRange]);

  const departmentOptions = useMemo(() => {
    const items = [...new Set((data?.recentPatients.data ?? []).map((p) => p.department))].sort();
    return [{ label: "All departments", value: "all" }, ...items.map((value) => ({ label: value, value }))];
  }, [data]);

  const activityColumns: Column<DashboardActivityItem>[] = useMemo(
    () => [
      {
        key: "activity",
        header: "Activity",
        sortValue: (row) => row.activity,
      },
      {
        key: "user",
        header: "User",
        sortValue: (row) => row.user,
        hideOnTablet: true,
      },
      {
        key: "department",
        header: "Department",
        sortValue: (row) => row.department,
      },
      {
        key: "timestamp",
        header: "Date / time",
        sortValue: (row) => row.timestamp,
        hideOnMobile: true,
      },
      {
        key: "status",
        header: "Status",
        sortValue: (row) => row.status,
        render: (row) => <StatusBadge status={row.status} />,
        align: "right",
      },
    ],
    [],
  );

  const overviewColumns: Column<DashboardAppointmentOverview>[] = useMemo(
    () => [
      { key: "patient", header: "Patient", sortValue: (row) => row.patient },
      { key: "doctor", header: "Doctor", sortValue: (row) => row.doctor, hideOnTablet: true },
      { key: "department", header: "Department", sortValue: (row) => row.department },
      { key: "time", header: "Time", sortValue: (row) => row.time, align: "right" },
      {
        key: "status",
        header: "Status",
        sortValue: (row) => row.status,
        render: (row) => <StatusBadge status={row.status} />,
        align: "right",
      },
    ],
    [],
  );

  if (state === "error") {
    return (
      <>
        <PageHeader title="Hospital Administration Dashboard" description="Demo overview for GHMS operations and monitoring." />
        <ErrorState
          message="The dashboard could not be loaded. Check your connection and try again."
          onRetry={() => setReloadKey((key) => key + 1)}
          className="rounded-card border border-slate-200 bg-surface-light shadow-card dark:border-slate-800 dark:bg-surface-dark"
        />
      </>
    );
  }

  if (state === "loading" || !data) {
    return (
      <>
        <PageHeader title="Hospital Administration Dashboard" description="Demo overview for GHMS operations and monitoring." />
        <LoadingState variant="page" label="Loading dashboard" />
      </>
    );
  }

  const patientMixData = data.departmentMix.filter((item) =>
    departmentFilter === "all" ? true : item.name === departmentFilter,
  );

  const chartMetrics = data.patientTrend.map((row) => ({
    ...row,
    visits: departmentFilter === "all" ? row.visits : Math.round(row.visits * 0.85),
    registrations: departmentFilter === "all" ? row.registrations : Math.round(row.registrations * 0.9),
  }));

  return (
    <>
      <PageHeader
        title="Hospital Administration Dashboard"
        description="Demo operational overview for GHMS — not production hospital data."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Dashboard date filter"
              value={selectedRange}
              onChange={(event) => setSelectedRange(event.target.value as RangePreset)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {dateFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCcw className="h-4 w-4" />} onClick={() => setReloadKey((value) => value + 1)}>
              Refresh
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />}>Export report</Button>
          </div>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Welcome back</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currentUser.name}</h2>
            </div>
            <div className="rounded-full bg-light-blue px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary/15 dark:text-primary-300">
              {currentUser.department}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Current date</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Date filter</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{dateLabel}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
              <p className="mt-1 text-sm font-semibold text-success dark:text-green-400">Live mock data</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Data scope</p>
              <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-200">{dateLabel}</p>
            </div>
            <CalendarRange className="h-5 w-5 text-primary-600" />
          </div>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Department filter
            </label>
            <select
              aria-label="Department filter"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedRange === "custom" ? (
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" />
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {summaryMetrics.map((metric) => {
          const Icon = quickIconMap[metric.id] ?? Users;
          return (
            <StatCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              icon={<Icon className="h-5 w-5" />}
              change={metric.change}
              hint={metric.hint}
              tone={metric.tone}
              className="min-h-[164px]"
            />
          );
        })}
      </div>

      <PrimaryOverviewCharts
        chartMetrics={chartMetrics}
        patientMixData={patientMixData}
        departmentMix={data.departmentMix}
      />

      <SecondaryOverviewCharts
        appointmentBreakdown={data.appointmentBreakdown}
        financialTrend={data.financialTrend}
        occupancyTrend={data.occupancyTrend}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card flush>
          <CardHeader title="Recent activities" subtitle="System events and operational updates" />
          <DataTable
            columns={activityColumns}
            data={data.recentActivities}
            keyExtractor={(row) => row.id}
            pageSize={5}
            emptyState={{ icon: Activity, title: "No recent activity" }}
          />
        </Card>

        <Card flush>
          <CardHeader title="Emergency overview" subtitle="Protected patient summaries only" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.emergencyCases.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{item.id}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.patientId} · {item.triage}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.arrivalTime}</p>
                  <StatusBadge status={item.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card flush>
          <CardHeader title="Appointment overview" subtitle="Upcoming appointments and assigned clinicians" actions={<Button href="/appointments" variant="ghost" size="sm">View all</Button>} />
          <DataTable
            columns={overviewColumns}
            data={data.upcomingAppointments}
            keyExtractor={(row) => row.id}
            pageSize={4}
            emptyState={{ icon: CalendarCheck, title: "No upcoming appointments" }}
          />
        </Card>

        <Card flush>
          <CardHeader title="Pharmacy alerts" subtitle="Inventory risks and expiry watchlist" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.pharmacyAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between gap-3 px-5 py-3.5 sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{alert.medicine}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Batch: {alert.batch} · Qty: {alert.quantity} · Expiry: {alert.expiry}</p>
                </div>
                <StatusBadge status={alert.alertType.toLowerCase().replace(/\s+/g, "-")} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <LabOverviewChart labTrend={data.labTrend} />

        <Card flush>
          <CardHeader title="Quick actions" subtitle="Frequent operational tasks" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {data.quickActions.map((action) => {
              const Icon = quickIconMap[action.icon] ?? ArrowRight;
              return (
                <Button key={action.id} href={action.href} variant={action.tone === "primary" ? "primary" : action.tone === "success" ? "secondary" : action.tone === "warning" ? "secondary" : "secondary"} className="h-auto justify-start px-3 py-3" leftIcon={<Icon className="h-4 w-4" />}>
                  <span className="truncate">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
