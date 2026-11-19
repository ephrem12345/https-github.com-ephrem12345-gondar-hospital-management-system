"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarPlus, Edit3, FileText, Printer, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ListTemplate } from "@/components/templates/ListTemplate";
import { mockPatients } from "@/data/mock";
import type { ListScreen, AnyRow } from "@/modules/types";
import type { Patient } from "@/types";
import { useTranslation } from "@/lib/i18n/I18nProvider";

interface PatientRecord extends AnyRow {
  id: string;
  mrn: string;
  name: string;
  gender: string;
  age: number;
  phone: string;
  department: string;
  status: string;
  lastVisit: string;
  createdAt: string;
  dateOfBirth: string;
  bloodGroup: string;
}

const dateFilterOptions = [
  { label: "All dates", value: "all" },
  { label: "This month", value: "thisMonth" },
  { label: "Last 30 days", value: "last30" },
  { label: "Older than 30 days", value: "older30" },
];

function ageOf(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

function toRows(): PatientRecord[] {
  return mockPatients.map((patient: Patient) => ({
    id: patient.id,
    mrn: patient.mrn,
    name: `${patient.firstName} ${patient.lastName}`,
    gender: patient.gender,
    age: ageOf(patient.dateOfBirth),
    phone: patient.phone,
    department: patient.department,
    status: patient.status,
    lastVisit: patient.lastVisit,
    createdAt: patient.createdAt,
    dateOfBirth: patient.dateOfBirth,
    bloodGroup: "O+",
  }));
}

function matchesDateFilter(row: PatientRecord, filter: string) {
  if (filter === "all") return true;
  const dateValue = new Date(row.createdAt).getTime();
  const now = new Date().getTime();
  const diffDays = (now - dateValue) / (1000 * 60 * 60 * 24);
  if (filter === "thisMonth") return diffDays <= 31;
  if (filter === "last30") return diffDays <= 30;
  if (filter === "older30") return diffDays > 30;
  return true;
}

export function PatientManagementScreen({
  title,
  screen,
}: {
  title: string;
  screen: ListScreen;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PatientRecord[]>(toRows);
  const [selected, setSelected] = useState<PatientRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "personal" | "clinical" | "documents">("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Pick<PatientRecord, "name" | "gender" | "dateOfBirth" | "phone"> | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        row.mrn.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q);
      const matchesGender = genderFilter === "all" || row.gender === genderFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesDate = matchesDateFilter(row, dateFilter);
      return matchesQuery && matchesGender && matchesStatus && matchesDate;
    });
  }, [rows, query, genderFilter, statusFilter, dateFilter]);

  const startEdit = (row: PatientRecord) => {
    setSelected(row);
    setActiveTab("personal");
    setEditDraft({ name: row.name, gender: row.gender, dateOfBirth: row.dateOfBirth, phone: row.phone });
    setIsEditing(true);
    setUpdateMessage("");
  };

  const savePatientEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !editDraft) return;
    const updated: PatientRecord = { ...selected, ...editDraft, age: ageOf(editDraft.dateOfBirth) };
    setRows((current) => current.map((row) => row.id === updated.id ? updated : row));
    setSelected(updated);
    setEditDraft(null);
    setIsEditing(false);
    setUpdateMessage("Patient details updated in this demonstration session.");
  };

  const columns: Column<PatientRecord>[] = [
    {
      key: "name",
      header: t("table.patient"),
      sortValue: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-light-blue text-[11px] font-semibold text-primary-700 dark:bg-primary/15 dark:text-primary-300">
            {row.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-700 dark:text-slate-200">{row.name}</p>
            <p className="truncate text-xs text-slate-400">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "mrn",
      header: t("table.patientId"),
      sortValue: (row) => row.mrn,
      hideOnMobile: true,
      render: (row) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{row.mrn}</span>,
    },
    { key: "gender", header: "Gender", hideOnTablet: true, sortValue: (row) => row.gender, render: (row) => <span className="capitalize">{row.gender}</span> },
    { key: "age", header: "Age", align: "right", sortValue: (row) => row.age },
    { key: "department", header: t("table.department"), sortValue: (row) => row.department, hideOnTablet: true },
    { key: "bloodGroup", header: "Blood group", sortValue: (row) => row.bloodGroup, hideOnMobile: true },
    {
      key: "status",
      header: t("table.status"),
      sortValue: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "lastVisit",
      header: t("table.lastVisit"),
      align: "right",
      sortValue: (row) => row.lastVisit,
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(row.lastVisit).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            onClick={(event) => {
              event.stopPropagation();
              setSelected(row);
            }}
          >
            View
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            onClick={(event) => {
              event.stopPropagation();
              startEdit(row);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            onClick={(event) => {
              event.stopPropagation();
              window.print();
            }}
          >
            Print
          </button>
        </div>
      ),
    },
  ];

  const patientTimeline = [
    { title: "Registration completed", detail: `${selected?.mrn ?? "GHMS-000000"} issued for intake`, time: "Today" },
    { title: "Last departmental visit", detail: `${selected?.department ?? "General"} consultation`, time: selected?.lastVisit ?? "N/A" },
    { title: "Status review", detail: `Patient currently marked as ${selected?.status ?? "stable"}`, time: "Current" },
    { title: "Follow-up plan", detail: "Routine review and medication follow-up scheduled", time: "Next 7 days" },
  ];

  const documents = [
    { title: "Medical reports", type: "Cardiology", status: "Ready" },
    { title: "Laboratory reports", type: "CBC / Lipid panel", status: "Verified" },
    { title: "Imaging documents", type: "Chest X-ray", status: "Available" },
    { title: "Referral documents", type: "Internal referral", status: "Issued" },
    { title: "Insurance documents", type: "Policy summary", status: "Filed" },
  ];

  return (
    <>
      <PageHeader
        title={title}
        description={screen.description}
        actions={
          <Button href="/patient-registration" leftIcon={<CalendarPlus className="h-4 w-4" aria-hidden />}>
            Register patient
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Patients" value={String(rows.length)} icon={<Users className="h-5 w-5" />} tone="primary" />
        <StatCard label="Stable" value={String(rows.filter((row) => row.status === "stable").length)} icon={<Users className="h-5 w-5" />} tone="success" />
        <StatCard label="Recovering" value={String(rows.filter((row) => row.status === "recovering").length)} icon={<Users className="h-5 w-5" />} tone="warning" />
        <StatCard label="Critical" value={String(rows.filter((row) => row.status === "critical").length)} icon={<Users className="h-5 w-5" />} tone="danger" />
      </div>

      <Card flush className="mt-6">
        <CardHeader title={title} subtitle="View, edit and print patient records with filters and searchable fields." />
        <DataTable
          columns={columns}
          data={filteredRows}
          keyExtractor={(row) => String(row.id)}
          pageSize={8}
          onRowClick={setSelected}
          emptyState={{ icon: Search, title: "No matching patients" }}
          toolbar={
            <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <SearchInput
                value={query}
                onValueChange={setQuery}
                onClear={() => setQuery("")}
                placeholder="Search by patient ID, name or phone…"
                wrapperClassName="xl:max-w-md"
                aria-label="Search patient records"
              />
              <div className="flex flex-wrap gap-2">
                <FilterDropdown
                  label="Gender"
                  options={[{ label: "All genders", value: "all" }, { label: "Male", value: "male" }, { label: "Female", value: "female" }]}
                  value={genderFilter}
                  onValueChange={setGenderFilter}
                  aria-label="Filter by gender"
                />
                <FilterDropdown
                  label="Status"
                  options={[{ label: "All statuses", value: "all" }, { label: "Stable", value: "stable" }, { label: "Recovering", value: "recovering" }, { label: "Critical", value: "critical" }, { label: "Discharged", value: "discharged" }]}
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  aria-label="Filter by patient status"
                />
                <FilterDropdown
                  label="Date"
                  options={dateFilterOptions}
                  value={dateFilter}
                  onValueChange={setDateFilter}
                  aria-label="Filter by registration date"
                />
              </div>
            </div>
          }
        />
      </Card>

      <Modal
        open={selected !== null}
        onClose={() => { setSelected(null); setIsEditing(false); setEditDraft(null); }}
        title={selected ? selected.name : "Patient profile"}
        description={selected ? `${selected.mrn} · ${selected.department}` : undefined}
        size="xl"
      >
        {selected ? (
          <div className="space-y-6">
            {updateMessage ? <p role="status" className="text-sm text-success">{updateMessage}</p> : null}
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary/15 dark:text-primary-300">
                  {selected.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{selected.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selected.mrn} · {selected.phone}</p>
                </div>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "overview", label: "Overview" },
                { id: "personal", label: "Personal information" },
                { id: "clinical", label: "Medical history" },
                { id: "documents", label: "Documents" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${activeTab === tab.id ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Patient age</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">{selected.age} yrs</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Last visit</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">
                    {new Date(selected.lastVisit).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Blood group</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">{selected.bloodGroup}</p>
                </div>

                <div className="md:col-span-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Patient timeline</p>
                  <div className="mt-4 space-y-4">
                    {patientTimeline.map((item) => (
                      <div key={item.title} className="flex gap-3">
                        <span className="mt-1 flex h-2.5 w-2.5 rounded-full bg-primary-600" aria-hidden />
                        <div className="flex-1">
                          <p className="font-medium text-slate-700 dark:text-slate-200">{item.title}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{item.detail}</p>
                        </div>
                        <span className="text-xs text-slate-400">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "personal" && isEditing && editDraft ? (
              <form onSubmit={savePatientEdit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium">Full name<input aria-label="Full name" className="ghms-input" value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} required /></label>
                  <label className="space-y-1 text-sm font-medium">Gender<select aria-label="Gender" className="ghms-input" value={editDraft.gender} onChange={(event) => setEditDraft({ ...editDraft, gender: event.target.value })}><option value="male">Male</option><option value="female">Female</option></select></label>
                  <label className="space-y-1 text-sm font-medium">Date of birth<input aria-label="Date of birth" type="date" className="ghms-input" value={editDraft.dateOfBirth} onChange={(event) => setEditDraft({ ...editDraft, dateOfBirth: event.target.value })} required /></label>
                  <label className="space-y-1 text-sm font-medium">Phone<input aria-label="Phone" type="tel" className="ghms-input" value={editDraft.phone} onChange={(event) => setEditDraft({ ...editDraft, phone: event.target.value })} required /></label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Save changes</Button>
                  <Button type="button" variant="secondary" onClick={() => { setIsEditing(false); setEditDraft(null); }}>Cancel edits</Button>
                </div>
              </form>
            ) : null}

            {activeTab === "personal" && !isEditing ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                {[
                  ["Full name", selected.name],
                  ["Gender", selected.gender],
                  ["Date of birth", selected.dateOfBirth],
                  ["Age", `${selected.age} years`],
                  ["Phone", selected.phone],
                  ["Department", selected.department],
                  ["Registration date", selected.createdAt],
                  ["Blood group", selected.bloodGroup],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
                    <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {activeTab === "clinical" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary-600" /> <p className="font-semibold text-slate-800 dark:text-slate-100">Medical history</p></div>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li>• Hypertension under supervision</li>
                    <li>• Seasonal asthma with intermittent symptoms</li>
                    <li>• Recurrent medication review scheduled</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex items-center gap-2"><Edit3 className="h-4 w-4 text-primary-600" /> <p className="font-semibold text-slate-800 dark:text-slate-100">Current plan</p></div>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li>• Continue routine blood-pressure monitoring</li>
                    <li>• Review medication adherence at next visit</li>
                    <li>• Order repeat labs if symptoms persist</li>
                  </ul>
                </div>
              </div>
            ) : null}

            {activeTab === "documents" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {documents.map((document) => (
                  <div key={document.title} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{document.title}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{document.type}</p>
                    <div className="mt-4 inline-flex rounded-full bg-primary-100 px-2 py-1 text-[11px] font-medium text-primary-700 dark:bg-primary/15 dark:text-primary-300">{document.status}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => { setSelected(null); setIsEditing(false); setEditDraft(null); setUpdateMessage(""); }}>
                Close
              </Button>
              <Button type="button" variant="secondary" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" aria-hidden />}>
                Print patient information
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

/** Shared list screen renderer used by the catch-all route. */
export function GenericListScreen({
  title,
  screen,
}: {
  title: string;
  screen: ListScreen;
}) {
  return (
    <ListTemplate<AnyRow>
      title={title}
      description={screen.description}
      stats={screen.stats}
      columns={screen.columns as Column<AnyRow>[]}
      data={screen.data as AnyRow[]}
      keyExtractor={screen.keyExtractor}
      searchKeys={screen.searchKeys}
      searchPlaceholder={screen.searchPlaceholder}
      filters={screen.filters as never}
      onRowClick={screen.onRowClick as never}
      emptyIcon={screen.emptyIcon}
      pageSize={screen.pageSize}
    />
  );
}
