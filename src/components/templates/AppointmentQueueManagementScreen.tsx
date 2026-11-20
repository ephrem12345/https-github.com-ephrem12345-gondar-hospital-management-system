"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CalendarCheck2,
  Clock3,
  Eye,
  ListFilter,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { appointmentBackendApi } from "@/services/backend-services";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  appointmentSchema,
  type AppointmentInput,
} from "@/validation/schemas";

export type AppointmentQueueView = "appointments" | "queue" | "waiting-room";
type CalendarView = "daily" | "weekly" | "monthly";
type AppointmentStatus =
  | "Scheduled"
  | "Confirmed"
  | "Checked In"
  | "Completed"
  | "Cancelled"
  | "No Show";
type QueueStatus =
  | "Waiting"
  | "Consulting"
  | "Completed"
  | "Absent"
  | "Transferred";

interface AppointmentRow extends AppointmentInput {
  id: string;
  patient: string;
  dateLabel?: string;
  status: AppointmentStatus;
}

interface QueueRow {
  queueNumber: number;
  patientId: string;
  patient: string;
  department: string;
  doctor: string;
  checkIn: string;
  waiting: string;
  status: QueueStatus;
}

const patients = [
  { id: "GHMS-01042", name: "Selam Bekele" },
  { id: "GHMS-01043", name: "Kebede Assefa" },
  { id: "GHMS-01044", name: "Meron Ayele" },
  { id: "GHMS-01045", name: "Tesfaye Tadesse" },
  { id: "GHMS-01046", name: "Hanna Girma" },
  { id: "GHMS-01047", name: "Dawit Haile" },
];

const doctors = [
  { name: "Dr. Selam Girma", department: "Internal Medicine", days: "Mon–Fri", hours: "08:00–16:00", booked: 6, available: 4 },
  { name: "Dr. Mulu Alemu", department: "Surgery", days: "Mon–Thu", hours: "09:00–17:00", booked: 7, available: 3 },
  { name: "Dr. Kidist Haile", department: "Gynecology & Obstetrics", days: "Tue–Sat", hours: "08:30–15:30", booked: 5, available: 5 },
  { name: "Dr. Bereket Assefa", department: "Pediatrics", days: "Mon–Fri", hours: "07:30–15:30", booked: 8, available: 2 },
  { name: "Dr. Fikru Tsegaye", department: "Emergency", days: "Daily", hours: "24 hours", booked: 3, available: 5 },
];

const initialAppointments: AppointmentRow[] = [
  { id: "APT-1042", patient: "Selam Bekele", patientId: "GHMS-01042", doctor: "Dr. Mulu Alemu", department: "Surgery", date: localDate(0), dateLabel: "Today", time: "08:30", status: "Confirmed", type: "consultation", reason: "Pre-op review", notes: "" },
  { id: "APT-1043", patient: "Kebede Assefa", patientId: "GHMS-01043", doctor: "Dr. Kidist Haile", department: "Gynecology & Obstetrics", date: localDate(0), dateLabel: "Today", time: "09:00", status: "Checked In", type: "follow-up", reason: "Follow-up consultation", notes: "" },
  { id: "APT-1044", patient: "Meron Ayele", patientId: "GHMS-01044", doctor: "Dr. Selam Girma", department: "Internal Medicine", date: localDate(0), dateLabel: "Today", time: "09:35", status: "Scheduled", type: "consultation", reason: "General consultation", notes: "" },
  { id: "APT-1045", patient: "Tesfaye Tadesse", patientId: "GHMS-01045", doctor: "Dr. Bereket Assefa", department: "Pediatrics", date: localDate(0), dateLabel: "Today", time: "10:15", status: "Completed", type: "follow-up", reason: "Review", notes: "" },
  { id: "APT-1046", patient: "Hanna Girma", patientId: "GHMS-01046", doctor: "Dr. Mulu Alemu", department: "Surgery", date: localDate(0), dateLabel: "Today", time: "11:10", status: "Cancelled", type: "procedure", reason: "Procedure review", notes: "" },
  { id: "APT-1047", patient: "Dawit Haile", patientId: "GHMS-01047", doctor: "Dr. Selam Girma", department: "Internal Medicine", date: localDate(1), dateLabel: "Tomorrow", time: "08:45", status: "No Show", type: "follow-up", reason: "Follow-up", notes: "" },
  { id: "APT-1048", patient: "Sara Alemu", patientId: "GHMS-01048", doctor: "Dr. Bereket Assefa", department: "Pediatrics", date: localDate(3), dateLabel: humanDate(localDate(3)), time: "10:00", status: "Scheduled", type: "consultation", reason: "Pediatric consultation", notes: "" },
  { id: "APT-1049", patient: "Yohannes Kebede", patientId: "GHMS-01049", doctor: "Dr. Selam Girma", department: "Internal Medicine", date: localDate(5), dateLabel: humanDate(localDate(5)), time: "14:00", status: "Confirmed", type: "follow-up", reason: "Follow-up appointment", notes: "" },
];

const initialQueue: QueueRow[] = [
  { queueNumber: 27, patientId: "GHMS-000627", patient: "Abebe Tekle", department: "Internal Medicine", doctor: "Dr. Selam Girma", checkIn: "08:12", waiting: "18 min", status: "Waiting" },
  { queueNumber: 28, patientId: "GHMS-000628", patient: "Sara Kebede", department: "Pediatrics", doctor: "Dr. Bereket Assefa", checkIn: "08:18", waiting: "12 min", status: "Consulting" },
  { queueNumber: 29, patientId: "GHMS-000629", patient: "Getachew Molla", department: "Surgery", doctor: "Dr. Mulu Alemu", checkIn: "08:25", waiting: "7 min", status: "Waiting" },
  { queueNumber: 30, patientId: "GHMS-000630", patient: "Marta Alemu", department: "Orthopedics", doctor: "Dr. Kidist Haile", checkIn: "08:30", waiting: "4 min", status: "Transferred" },
  { queueNumber: 31, patientId: "GHMS-000631", patient: "Yohannes Bekele", department: "Emergency", doctor: "Dr. Fikru Tsegaye", checkIn: "08:35", waiting: "1 min", status: "Completed" },
];

const departments = [
  "Internal Medicine",
  "Surgery",
  "Gynecology & Obstetrics",
  "Pediatrics",
  "Orthopedics",
  "Emergency",
];
const timeslots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:00"];
const appointmentStatuses: AppointmentStatus[] = ["Scheduled", "Confirmed", "Checked In", "Completed", "Cancelled", "No Show"];
const queueStatuses: QueueStatus[] = ["Waiting", "Consulting", "Completed", "Absent", "Transferred"];

function localDate(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateValue: string, offset: number): string {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function humanDate(date: string): string {
  if (date === localDate(0)) return "Today";
  if (date === localDate(1)) return "Tomorrow";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initialFormValues(): AppointmentInput {
  return {
    patientId: "",
    doctor: "",
    department: "",
    date: localDate(0),
    time: "",
    type: "consultation",
    reason: "",
    notes: "",
  };
}

function badgeVariant(status: string) {
  if (status === "Completed" || status === "Consulting") return "success" as const;
  if (status === "Cancelled" || status === "Absent") return "danger" as const;
  if (status === "No Show" || status === "Waiting") return "warning" as const;
  if (status === "Checked In" || status === "Transferred") return "info" as const;
  return "primary" as const;
}

export function AppointmentQueueManagementScreen({
  title,
  view = "appointments",
}: {
  title: string;
  view?: AppointmentQueueView;
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [queue, setQueue] = useState(initialQueue);
  const [calendarView, setCalendarView] = useState<CalendarView>("daily");
  const [calendarDate, setCalendarDate] = useState(localDate(0));
  const [form, setForm] = useState<AppointmentInput>(initialFormValues);
  const [patientSearch, setPatientSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [queueDepartment, setQueueDepartment] = useState<Record<number, string>>({});
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    appointmentBackendApi.list(localDate(-30), localDate(30))
      .then((items) => {
        if (mounted && items && items.length > 0) {
          setAppointments(items.map((item) => ({ ...item, dateLabel: humanDate(item.date) })));
        }
      })
      .catch(() => {});

    appointmentBackendApi.listQueue()
      .then((entries) => {
        if (mounted && entries && entries.length > 0) {
          setQueue(entries.map((item) => ({ ...item, patient: `Patient ${item.patientId.slice(0, 8)}`, waiting: "Just now" })));
        }
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  const selectedPatient = patients.find((patient) => patient.id === form.patientId);
  const filteredPatients = patients.filter((patient) =>
    `${patient.name} ${patient.id}`.toLowerCase().includes(patientSearch.toLowerCase()),
  );
  const departmentDoctors = doctors.filter((doctor) => doctor.department === form.department);

  const stats = useMemo(
    () => [
      { label: "Today's appointments", value: appointments.filter((item) => item.date === localDate(0) && item.status !== "Cancelled").length, icon: CalendarCheck2 },
      { label: "Upcoming appointments", value: appointments.filter((item) => item.date >= localDate(0) && ["Scheduled", "Confirmed"].includes(item.status)).length, icon: Clock3 },
      { label: "Completed", value: appointments.filter((item) => item.status === "Completed").length, icon: UserRoundCheck },
      { label: "Cancelled", value: appointments.filter((item) => item.status === "Cancelled").length, icon: CalendarCheck2 },
      { label: "No-show", value: appointments.filter((item) => item.status === "No Show").length, icon: ListFilter },
      { label: "Waiting patients", value: queue.filter((item) => item.status === "Waiting").length, icon: Users },
      { label: "Available doctors", value: doctors.filter((doctor) => doctor.available > 0).length, icon: Eye },
    ],
    [appointments, queue],
  );

  const calendarDays = useMemo(() => {
    if (calendarView === "daily") return [calendarDate];
    if (calendarView === "weekly") {
      return Array.from({ length: 7 }, (_, index) => addDays(calendarDate, index));
    }

    const firstOfMonth = `${calendarDate.slice(0, 7)}-01`;
    const leadingDays = new Date(`${firstOfMonth}T00:00:00`).getDay();
    const firstGridDate = addDays(firstOfMonth, -leadingDays);
    return Array.from({ length: 42 }, (_, index) => addDays(firstGridDate, index));
  }, [calendarDate, calendarView]);

  const calendarTitle = calendarView === "daily"
    ? humanDate(calendarDate)
    : calendarView === "weekly"
      ? `Week of ${humanDate(calendarDate)}`
      : new Date(`${calendarDate.slice(0, 7)}-01T00:00:00`).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        });

  const focusForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const updateForm = (field: keyof AppointmentInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const submitAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = appointmentSchema.safeParse(form);
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Review the appointment details.");
      return;
    }

    const patient = patients.find((item) => item.id === result.data.patientId);
    if (!patient) {
      setFormError("Select a patient from the patient search results.");
      return;
    }

    try {
      if (editingId) {
        await appointmentBackendApi.update(editingId, result.data).catch(() => {});
        setAppointments((items) =>
          items.map((item) =>
            item.id === editingId
              ? { ...item, ...result.data, patient: patient.name, dateLabel: humanDate(result.data.date) }
              : item,
          ),
        );
      } else {
        const created = await appointmentBackendApi.create(result.data).catch(() => null);
        setAppointments((items) => [
          {
            ...result.data,
            id: created?.id ?? `APT-${Date.now().toString().slice(-6)}`,
            patient: patient.name,
            dateLabel: humanDate(result.data.date),
            status: "Scheduled",
          },
          ...items,
        ]);
      }
    } catch {
      // optimistic fallback
    }

    setForm(initialFormValues());
    setPatientSearch("");
    setEditingId(null);
    setFormError("");
  };

  const editAppointment = (appointment: AppointmentRow) => {
    setEditingId(appointment.id);
    setForm({
      patientId: appointment.patientId,
      doctor: appointment.doctor,
      department: appointment.department,
      date: appointment.date,
      time: appointment.time,
      type: appointment.type as AppointmentInput["type"],
      reason: appointment.reason,
      notes: appointment.notes ?? "",
    });
    setPatientSearch(appointment.patient);
    setFormError("");
    focusForm();
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    void appointmentBackendApi.updateStatus(id, status).catch(() => {});
    setAppointments((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  };

  const callNextPatient = () => {
    const next = queue.find((item) => item.status === "Waiting");
    if (!next) return;
    void appointmentBackendApi.callNextPatient(next.department).catch(() => {});
    setQueue((items) => items.map((item) => item.queueNumber === next.queueNumber ? { ...item, status: "Consulting" } : item));
  };

  const updateQueueStatus = (queueNumber: number, status: QueueStatus) => {
    void appointmentBackendApi.updateQueueStatus(queueNumber, status).catch(() => {});
    setQueue((items) => items.map((item) => item.queueNumber === queueNumber ? { ...item, status } : item));
  };

  if (view === "waiting-room") {
    return (
      <section aria-label="Public waiting room display" className="min-h-[70vh] rounded-2xl bg-slate-950 p-5 text-white sm:p-8">
        <PageHeader title={title} description="Public waiting-area display. Patient names and identifiers are intentionally hidden." />
        <div className="grid gap-5 lg:grid-cols-3">
          {departments.slice(0, 3).map((department, index) => {
            const departmentQueue = queue.filter((item) => item.department === department);
            const roomNumber = [27, 18, 11][index];
            const roomDoctor = doctors.find((doctor) => doctor.department === department)?.name ?? "Duty clinician";
            const currentServing = departmentQueue.find((item) => item.status === "Consulting")?.queueNumber ?? roomNumber;
            const waitingNumbers = departmentQueue.filter((item) => item.status === "Waiting").map((item) => item.queueNumber);
            return (
              <Card key={department} className="border-slate-700 bg-slate-900 p-6 text-white">
                <div className="text-sm font-semibold uppercase tracking-widest text-sky-300">{department}</div>
                <div className="mt-6 text-sm text-slate-400">Assigned doctor</div>
                <div className="text-lg font-medium">{roomDoctor}</div>
                <div className="mt-6 rounded-xl bg-sky-500/10 p-5 text-center">
                  <div className="text-xs uppercase tracking-widest text-sky-300">Now serving</div>
                  <div className="mt-1 text-6xl font-bold text-sky-300">#{currentServing}</div>
                </div>
                <div className="mt-5 text-xs uppercase tracking-widest text-slate-400">Waiting numbers</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(waitingNumbers.length ? waitingNumbers : [roomNumber + 1, roomNumber + 2]).map((number) => (
                    <span key={number} className="rounded-lg bg-slate-800 px-3 py-2 text-lg font-semibold">#{number}</span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        description="Demo appointment planning and patient-flow tools. Changes in this preview are held in browser memory only."
        actions={(
          <div className="flex flex-wrap gap-2">
            {view === "appointments" ? <Button onClick={focusForm}>New appointment</Button> : null}
            <Button variant="secondary" href="/waiting-room">Waiting room display</Button>
          </div>
        )}
      />

      {view === "appointments" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
                    <Icon className="h-4 w-4 text-primary-600" aria-hidden />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <div ref={formRef}>
                <CardHeader title={editingId ? "Edit / reschedule appointment" : "Appointment registration"} subtitle="Search for a demo patient, select a department and clinician, then complete the booking details." />
              </div>
              <form className="mt-5 space-y-4" onSubmit={submitAppointment}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Patient search" htmlFor="appointment-patient-search" required>
                    <input
                      id="appointment-patient-search"
                      className="ghms-input"
                      value={patientSearch}
                      onChange={(event) => {
                        setPatientSearch(event.target.value);
                        setForm((current) => ({ ...current, patientId: "" }));
                      }}
                      placeholder="Search patient name or ID"
                      autoComplete="off"
                    />
                    {patientSearch && !selectedPatient ? (
                      <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        {filteredPatients.map((patient) => (
                          <button key={patient.id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => {
                            setPatientSearch(patient.name);
                            updateForm("patientId", patient.id);
                          }}>
                            <span className="font-medium">{patient.name}</span>
                            <span className="ml-2 text-xs text-slate-500">{patient.id}</span>
                          </button>
                        ))}
                        {filteredPatients.length === 0 ? <p className="px-3 py-2 text-sm text-slate-500">No matching demo patient.</p> : null}
                      </div>
                    ) : null}
                  </FormField>
                  <FormField label="Patient ID" htmlFor="appointment-patient-id">
                    <input id="appointment-patient-id" className="ghms-input" value={selectedPatient?.id ?? ""} readOnly placeholder="Select a patient above" />
                  </FormField>
                  <FormField label="Patient name" htmlFor="appointment-patient-name">
                    <input id="appointment-patient-name" className="ghms-input" value={selectedPatient?.name ?? ""} readOnly placeholder="Selected patient" />
                  </FormField>
                  <FormField label="Department" htmlFor="appointment-department" required>
                    <select id="appointment-department" className="ghms-input" value={form.department} onChange={(event) => {
                      updateForm("department", event.target.value);
                      updateForm("doctor", "");
                    }}>
                      <option value="">Select department</option>
                      {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Doctor" htmlFor="appointment-doctor" required>
                    <select id="appointment-doctor" className="ghms-input" value={form.doctor} onChange={(event) => updateForm("doctor", event.target.value)} disabled={!form.department}>
                      <option value="">Select doctor</option>
                      {departmentDoctors.map((doctor) => <option key={doctor.name} value={doctor.name}>{doctor.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Appointment date" htmlFor="appointment-date" required>
                    <input id="appointment-date" className="ghms-input" type="date" min={localDate(0)} value={form.date} onChange={(event) => updateForm("date", event.target.value)} />
                  </FormField>
                  <FormField label="Available time slot" htmlFor="appointment-time" required>
                    <select id="appointment-time" className="ghms-input" value={form.time} onChange={(event) => updateForm("time", event.target.value)}>
                      <option value="">Select time</option>
                      {timeslots.map((time) => <option key={time} value={time}>{time}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Appointment type" htmlFor="appointment-type" required>
                    <select id="appointment-type" className="ghms-input" value={form.type} onChange={(event) => updateForm("type", event.target.value)}>
                      <option value="consultation">Consultation</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="emergency">Emergency</option>
                      <option value="procedure">Procedure</option>
                    </select>
                  </FormField>
                  <FormField label="Reason for appointment" htmlFor="appointment-reason" required className="md:col-span-2">
                    <textarea id="appointment-reason" className="ghms-input min-h-20" maxLength={200} value={form.reason ?? ""} onChange={(event) => updateForm("reason", event.target.value)} />
                  </FormField>
                  <FormField label="Additional notes" htmlFor="appointment-notes" className="md:col-span-2">
                    <textarea id="appointment-notes" className="ghms-input min-h-20" maxLength={500} value={form.notes ?? ""} onChange={(event) => updateForm("notes", event.target.value)} />
                  </FormField>
                </div>
                {formError ? <p role="alert" className="text-sm text-danger">{formError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">{editingId ? "Save changes" : "Create appointment"}</Button>
                  <Button type="button" variant="secondary" onClick={() => {
                    setForm(initialFormValues());
                    setPatientSearch("");
                    setEditingId(null);
                    setFormError("");
                  }}>Clear form</Button>
                </div>
              </form>
            </Card>

            <Card>
              <CardHeader title="Doctor availability" subtitle="Demo schedules and slot capacity." />
              <div className="mt-5 space-y-3">
                {doctors.map((doctor) => (
                  <div key={doctor.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="font-semibold text-slate-800 dark:text-slate-100">{doctor.name}</div><div className="text-xs text-slate-500">{doctor.department}</div></div>
                      <StatusBadge status={doctor.available ? "available" : "pending"} size="sm" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span>Days: {doctor.days}</span><span>Hours: {doctor.hours}</span><span>Booked: {doctor.booked}</span><span>Available: {doctor.available}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader
              title="Appointment calendar"
              subtitle="Daily schedule, seven-day agenda and monthly calendar."
              actions={(
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label="Calendar date"
                    className="ghms-input h-9 w-40"
                    type="date"
                    value={calendarDate}
                    onChange={(event) => setCalendarDate(event.target.value)}
                  />
                  <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60">
                    {(["daily", "weekly", "monthly"] as CalendarView[]).map((period) => (
                      <button
                        key={period}
                        type="button"
                        aria-label={`Calendar ${period}`}
                        aria-pressed={calendarView === period}
                        onClick={() => setCalendarView(period)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${calendarView === period ? "bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-50" : "text-slate-500"}`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />
            <div className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{calendarTitle}</div>
            {calendarView === "monthly" ? (
              <div className="mt-3 overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-medium text-slate-500 dark:border-slate-800">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-2 py-2">{day}</div>)}
                  </div>
                  <div className="grid grid-cols-7">
                    {calendarDays.map((date) => {
                      const dayAppointments = appointments.filter((item) => item.date === date);
                      const inMonth = date.slice(0, 7) === calendarDate.slice(0, 7);
                      return (
                        <div key={date} className={`min-h-28 border-b border-r border-slate-100 p-2 dark:border-slate-800 ${inMonth ? "" : "bg-slate-50/70 text-slate-400 dark:bg-slate-900/40"}`}>
                          <div className="mb-1 text-xs font-semibold">{Number(date.slice(-2))}</div>
                          <div className="space-y-1">
                            {dayAppointments.slice(0, 2).map((appointment) => (
                              <button key={appointment.id} type="button" onClick={() => setSelectedAppointment(appointment)} className="block w-full truncate rounded bg-primary-50 px-1.5 py-1 text-left text-[10px] text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
                                {appointment.time} {appointment.patient}
                              </button>
                            ))}
                            {dayAppointments.length > 2 ? <div className="text-[10px] text-slate-500">+{dayAppointments.length - 2} more</div> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`mt-3 grid gap-3 ${calendarView === "weekly" ? "md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1"}`}>
                {calendarDays.map((date) => {
                  const dayAppointments = appointments.filter((item) => item.date === date).sort((a, b) => a.time.localeCompare(b.time));
                  return (
                    <section key={date} className="min-h-28 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {calendarView === "daily" ? humanDate(date) : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </h3>
                      {dayAppointments.length ? (
                        <div className="space-y-2">
                          {dayAppointments.map((appointment) => (
                            <button key={appointment.id} type="button" onClick={() => setSelectedAppointment(appointment)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-left dark:bg-slate-900/60">
                              <span><span className="block text-xs font-medium">{appointment.time} · {appointment.patient}</span><span className="block text-[11px] text-slate-500">{appointment.doctor} · {appointment.department}</span></span>
                              <StatusBadge status={appointment.status} variant={badgeVariant(appointment.status)} size="sm" />
                            </button>
                          ))}
                        </div>
                      ) : <p className="text-xs text-slate-500">No appointments.</p>}
                    </section>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="mt-6">
            <CardHeader title="Appointment management" subtitle="View, edit, reschedule or update appointment status." />
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="text-slate-500 dark:text-slate-400"><tr>{["Patient", "Department / Doctor", "Date", "Time", "Status", "Actions"].map((label) => <th key={label} className="pb-3 pr-4 font-medium">{label}</th>)}</tr></thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                      <td className="py-3 pr-4"><div className="font-medium">{appointment.patient}</div><div className="text-xs text-slate-500">{appointment.patientId} · {appointment.id}</div></td>
                      <td className="py-3 pr-4"><div>{appointment.department}</div><div className="text-xs text-slate-500">{appointment.doctor}</div></td>
                      <td className="py-3 pr-4">{humanDate(appointment.date)}</td><td className="py-3 pr-4">{appointment.time}</td>
                      <td className="py-3 pr-4"><StatusBadge status={appointment.status} variant={badgeVariant(appointment.status)} size="sm" /></td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => setSelectedAppointment(appointment)}>View</Button>
                          <Button size="sm" variant="secondary" onClick={() => editAppointment(appointment)}>Edit / reschedule</Button>
                          <select aria-label={`Update status for ${appointment.id}`} className="ghms-input h-8 w-36 py-1 text-xs" value={appointment.status} onChange={(event) => updateAppointmentStatus(appointment.id, event.target.value as AppointmentStatus)}>
                            {appointmentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><div className="text-sm text-slate-500">Waiting</div><div className="mt-2 text-2xl font-bold">{queue.filter((item) => item.status === "Waiting").length}</div></Card>
            <Card><div className="text-sm text-slate-500">Consulting</div><div className="mt-2 text-2xl font-bold">{queue.filter((item) => item.status === "Consulting").length}</div></Card>
            <Card><div className="text-sm text-slate-500">Completed</div><div className="mt-2 text-2xl font-bold">{queue.filter((item) => item.status === "Completed").length}</div></Card>
            <Card><div className="text-sm text-slate-500">Average wait</div><div className="mt-2 text-2xl font-bold">12 min</div></Card>
          </div>
          <Card className="mt-6">
            <CardHeader title="Patient queue" subtitle="Staff-only operational details. Patient identifiers are for demo purposes." actions={<Button onClick={callNextPatient}>Call next patient</Button>} />
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="text-slate-500 dark:text-slate-400"><tr>{["Queue", "Patient ID", "Department", "Doctor", "Check-in", "Wait", "Status", "Actions"].map((label) => <th key={label} className="pb-3 pr-4 font-medium">{label}</th>)}</tr></thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.queueNumber} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-3 pr-4 font-bold">#{item.queueNumber}</td><td className="py-3 pr-4">{item.patientId}</td><td className="py-3 pr-4">{item.department}</td><td className="py-3 pr-4">{item.doctor}</td><td className="py-3 pr-4">{item.checkIn}</td><td className="py-3 pr-4">{item.waiting}</td>
                      <td className="py-3 pr-4"><StatusBadge status={item.status} variant={badgeVariant(item.status)} size="sm" /></td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <select aria-label={`Update queue status ${item.queueNumber}`} className="ghms-input h-8 w-36 py-1 text-xs" value={item.status} onChange={(event) => updateQueueStatus(item.queueNumber, event.target.value as QueueStatus)}>
                            {queueStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <select aria-label={`Transfer queue ${item.queueNumber}`} className="ghms-input h-8 w-40 py-1 text-xs" value={queueDepartment[item.queueNumber] ?? item.department} onChange={(event) => setQueueDepartment((current) => ({ ...current, [item.queueNumber]: event.target.value }))}>
                            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                          </select>
                          <Button size="sm" variant="secondary" onClick={() => {
                            setQueue((items) => items.map((row) => row.queueNumber === item.queueNumber ? { ...row, department: queueDepartment[item.queueNumber] ?? item.department, status: "Transferred" } : row));
                          }}>Transfer</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Modal open={selectedAppointment !== null} onClose={() => setSelectedAppointment(null)} title="Appointment details" description={selectedAppointment?.id} size="md">
        {selectedAppointment ? (
          <div className="space-y-3 text-sm">
            <p><strong>Patient:</strong> {selectedAppointment.patient} ({selectedAppointment.patientId})</p>
            <p><strong>Department:</strong> {selectedAppointment.department}</p>
            <p><strong>Doctor:</strong> {selectedAppointment.doctor}</p>
            <p><strong>Date and time:</strong> {humanDate(selectedAppointment.date)} at {selectedAppointment.time}</p>
            <p><strong>Type:</strong> {selectedAppointment.type}</p>
            <p><strong>Reason:</strong> {selectedAppointment.reason || "Not provided"}</p>
            <p><strong>Status:</strong> <StatusBadge status={selectedAppointment.status} variant={badgeVariant(selectedAppointment.status)} size="sm" /></p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" onClick={() => {
                editAppointment(selectedAppointment);
                setSelectedAppointment(null);
              }}>Edit / reschedule</Button>
              <Button variant="secondary" onClick={() => setSelectedAppointment(null)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
