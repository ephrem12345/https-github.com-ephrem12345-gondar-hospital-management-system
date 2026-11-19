"use client";

import { useMemo } from "react";
import { Baby, Brain, Eye, HeartPulse, MonitorSmartphone, ScanHeart, Sparkles, Stethoscope, Syringe, Users, Wrench, Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GridTemplate } from "@/components/templates/GridTemplate";
import type { LucideIcon } from "lucide-react";

interface DepartmentData {
  name: string;
  icon: LucideIcon;
  description: string;
  staff: number;
  doctors: number;
  nurses: number;
  beds: { total: number; occupied: number };
  casesToday: number;
  avgWaitMinutes: number;
  head: string;
  weeklyCases: Record<string, number>;
}

const DEPARTMENTS: Record<string, DepartmentData> = {
  "internal-medicine": {
    name: "Internal Medicine", icon: Stethoscope,
    description: "Adult general medicine — inpatient care, chronic disease management and specialty clinics.",
    staff: 48, doctors: 12, nurses: 31, beds: { total: 90, occupied: 83 }, casesToday: 64, avgWaitMinutes: 22, head: "Dr. Selam Girma",
    weeklyCases: { Mon: 58, Tue: 63, Wed: 61, Thu: 70, Fri: 66, Sat: 41, Sun: 33 },
  },
  surgery: {
    name: "Surgery", icon: Syringe,
    description: "General and specialty surgical services including elective and emergency operations.",
    staff: 40, doctors: 10, nurses: 26, beds: { total: 60, occupied: 47 }, casesToday: 18, avgWaitMinutes: 35, head: "Dr. Mulu Alemu",
    weeklyCases: { Mon: 14, Tue: 19, Wed: 16, Thu: 21, Fri: 18, Sat: 9, Sun: 5 },
  },
  pediatrics: {
    name: "Pediatrics", icon: Baby,
    description: "Comprehensive care for infants, children and adolescents.",
    staff: 44, doctors: 11, nurses: 30, beds: { total: 70, occupied: 55 }, casesToday: 72, avgWaitMinutes: 18, head: "Dr. Bereket Assefa",
    weeklyCases: { Mon: 70, Tue: 66, Wed: 74, Thu: 78, Fri: 71, Sat: 52, Sun: 44 },
  },
  "gynecology-obstetrics": {
    name: "Gynecology & Obstetrics", icon: HeartPulse,
    description: "Maternal health, antenatal care, labor and delivery, and gynecologic services.",
    staff: 46, doctors: 10, nurses: 33, beds: { total: 65, occupied: 51 }, casesToday: 39, avgWaitMinutes: 20, head: "Dr. Kidist Haile",
    weeklyCases: { Mon: 34, Tue: 38, Wed: 41, Thu: 37, Fri: 40, Sat: 28, Sun: 24 },
  },
  orthopedics: {
    name: "Orthopedics", icon: Wrench,
    description: "Bone, joint and musculoskeletal care including trauma and physiotherapy follow-up.",
    staff: 28, doctors: 7, nurses: 18, beds: { total: 40, occupied: 29 }, casesToday: 21, avgWaitMinutes: 30, head: "Dr. Dawit Mengistu",
    weeklyCases: { Mon: 18, Tue: 22, Wed: 20, Thu: 25, Fri: 23, Sat: 12, Sun: 8 },
  },
  dentistry: {
    name: "Dentistry", icon: Sparkles,
    description: "Oral health services — extractions, restorations and preventive care.",
    staff: 14, doctors: 5, nurses: 8, beds: { total: 0, occupied: 0 }, casesToday: 26, avgWaitMinutes: 25, head: "Dr. Hana Tesfaye",
    weeklyCases: { Mon: 24, Tue: 27, Wed: 25, Thu: 30, Fri: 28, Sat: 15, Sun: 6 },
  },
  ophthalmology: {
    name: "Ophthalmology", icon: Eye,
    description: "Eye care including cataract surgery, screening and optical services.",
    staff: 16, doctors: 6, nurses: 9, beds: { total: 15, occupied: 8 }, casesToday: 33, avgWaitMinutes: 27, head: "Dr. Yonas Girma",
    weeklyCases: { Mon: 30, Tue: 34, Wed: 31, Thu: 36, Fri: 33, Sat: 18, Sun: 10 },
  },
  dermatology: {
    name: "Dermatology", icon: ScanHeart,
    description: "Skin, hair and nail conditions with clinic-based evaluation and treatment.",
    staff: 10, doctors: 4, nurses: 5, beds: { total: 0, occupied: 0 }, casesToday: 24, avgWaitMinutes: 24, head: "Dr. Meron Bekele",
    weeklyCases: { Mon: 22, Tue: 25, Wed: 24, Thu: 27, Fri: 26, Sat: 14, Sun: 5 },
  },
  psychiatry: {
    name: "Psychiatry", icon: Brain,
    description: "Mental health assessment, counseling and psychiatric treatment.",
    staff: 18, doctors: 5, nurses: 11, beds: { total: 25, occupied: 17 }, casesToday: 15, avgWaitMinutes: 32, head: "Dr. Rahel Wolde",
    weeklyCases: { Mon: 14, Tue: 16, Wed: 15, Thu: 18, Fri: 17, Sat: 9, Sun: 6 },
  },
  icu: {
    name: "ICU", icon: MonitorSmartphone,
    description: "Intensive care for critically ill patients with continuous monitoring.",
    staff: 32, doctors: 8, nurses: 22, beds: { total: 20, occupied: 18 }, casesToday: 4, avgWaitMinutes: 0, head: "Dr. Samuel Ayele",
    weeklyCases: { Mon: 4, Tue: 5, Wed: 3, Thu: 6, Fri: 4, Sat: 3, Sun: 2 },
  },
  physiotherapy: {
    name: "Physiotherapy", icon: Activity,
    description: "Rehabilitation and physical therapy for recovery and mobility.",
    staff: 12, doctors: 3, nurses: 4, beds: { total: 0, occupied: 0 }, casesToday: 19, avgWaitMinutes: 15, head: "Mr. Abebe Tessema",
    weeklyCases: { Mon: 18, Tue: 21, Wed: 19, Thu: 23, Fri: 20, Sat: 11, Sun: 4 },
  },
};

export function DepartmentWorkspaceScreen({ deptId }: { deptId: string }) {
  const dept = useMemo(() => DEPARTMENTS[deptId], [deptId]);

  if (!dept) return null;
  const Icon = dept.icon;

  return (
    <>
      <PageHeader
        title={dept.name}
        description={dept.description}
        actions={
          <span className="inline-flex items-center gap-2 rounded-lg bg-light-blue px-3 py-2 text-sm font-medium text-primary-700 dark:bg-primary/15 dark:text-primary-300">
            <Icon className="h-4 w-4" aria-hidden />
            Head: {dept.head}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Staff"
          value={String(dept.staff)}
          hint={`${dept.doctors} doctors · ${dept.nurses} nurses`}
          icon={<Users className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Cases Today"
          value={String(dept.casesToday)}
          hint={`Avg wait ${dept.avgWaitMinutes} min`}
          icon={<Activity className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Bed Occupancy"
          value={dept.beds.total ? `${Math.round((dept.beds.occupied / dept.beds.total) * 100)}%` : "N/A"}
          hint={dept.beds.total ? `${dept.beds.total - dept.beds.occupied} of ${dept.beds.total} beds free` : "Outpatient department"}
          icon={<HeartPulse className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Peak Day (this week)"
          value={Object.entries(dept.weeklyCases).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "—"}
          hint={String(Object.values(dept.weeklyCases).sort((a, b) => (b as number) - (a as number))[0] ?? "")}
          icon={<Icon className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card flush className="xl:col-span-2">
          <CardHeader title="Weekly case volume" subtitle="Demonstration data for preview" />
          <div className="flex h-56 items-end gap-2 px-5 pb-5 pt-2 sm:px-6">
            {Object.entries(dept.weeklyCases).map(([day, count]) => {
              const max = Math.max(...Object.values(dept.weeklyCases).map(Number));
              return (
                <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{count}</span>
                  <div
                    className="w-full max-w-10 rounded-t-md bg-primary-600/85 transition-all dark:bg-primary-500/80"
                    style={{ height: `${(Number(count) / max) * 100}%`, minHeight: 4 }}
                    aria-hidden
                  />
                  <span className="text-[11px] text-slate-400">{day}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card flush>
          <CardHeader title="Unit status" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { label: "Doctors on duty", value: `${Math.max(2, Math.round(dept.doctors / 3))} of ${dept.doctors}` },
              { label: "Nurses on shift", value: `${Math.max(3, Math.round(dept.nurses / 3))} of ${dept.nurses}` },
              { label: "Beds occupied", value: dept.beds.total ? `${dept.beds.occupied} / ${dept.beds.total}` : "—" },
              { label: "Average wait", value: dept.avgWaitMinutes ? `${dept.avgWaitMinutes} min` : "—" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3.5 sm:px-6">
                <span className="text-sm text-slate-500 dark:text-slate-400">{row.label}</span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-3.5 sm:px-6">
              <span className="text-sm text-slate-500 dark:text-slate-400">Service status</span>
              <StatusBadge status="active" />
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <GridTemplate
          title="Staff on duty today"
          screen={{
            description: "",
            items: Array.from({ length: 6 }).map((_, index) => ({
              id: `staff-${index}`,
              title: ["Dr. Selam Girma", "Dr. Mulu Alemu", "Sr. Tigist Alemu", "Sr. Bontu Kebede", "Dr. Bereket Assefa", "Sr. Hiwot Adane"][index],
              subtitle: index % 2 === 0 ? "Physician" : "Nurse",
              status: ["in-progress", "scheduled", "completed"][index % 3],
              category: index % 2 === 0 ? "Doctors" : "Nurses",
              details: [
                { label: "Shift", value: ["08:00–16:00", "16:00–00:00", "00:00–08:00"][index % 3] },
                { label: "Room", value: `R-${101 + index}` },
              ],
            })),
            filterLabel: "Show",
            filterOptions: [
              { label: "All staff", value: "" },
              { label: "Doctors", value: "Doctors" },
              { label: "Nurses", value: "Nurses" },
            ],
          }}
        />
      </div>
    </>
  );
}
