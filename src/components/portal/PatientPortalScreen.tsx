"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  patientPortalApi,
  isDemoPortal,
  demoPortalDocuments,
  demoPatientProfile,
  demoPortalAppointments,
  demoPortalNotifications,
  demoVisits,
  demoMedicalRecords,
  demoInvoices,
  demoPayments,
  demoAnnouncements,
  type PatientPortalAppointment,
  type PatientPortalInvoice,
  type PatientPortalMedicalRecord,
  type PatientPortalNotification,
  type PatientPortalPayment,
  type PatientPortalProfile,
  type PatientPortalAnnouncement,
  type PatientPortalSection,
  type PatientPortalVisit,
} from "@/services/patient-portal";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function PageSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">{children}</span>;
}

export function PatientPortalScreen({ section }: { section: PatientPortalSection }) {
  const [profile, setProfile] = useState<PatientPortalProfile | null>(null);
  const [appointments, setAppointments] = useState<PatientPortalAppointment[]>([]);
  const [notifications, setNotifications] = useState<PatientPortalNotification[]>([]);
  const [visits, setVisits] = useState<PatientPortalVisit[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<PatientPortalMedicalRecord[]>([]);
  const [invoices, setInvoices] = useState<PatientPortalInvoice[]>([]);
  const [payments, setPayments] = useState<PatientPortalPayment[]>([]);
  const [announcements, setAnnouncements] = useState<PatientPortalAnnouncement[]>([]);
  const [notificationCategory, setNotificationCategory] = useState("");
  const [supportMessages, setSupportMessages] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const demo = isDemoPortal();

  useEffect(() => {
    const api = patientPortalApi();
    let active = true;
    setLoading(true);
    setError("");
    const load = async () => {
      const failures: string[] = [];
      const guard = async (run: () => Promise<void>) => {
        try { await run(); } catch { failures.push("x"); }
      };
      await Promise.all([
        guard(async () => setProfile(await api.getProfile())),
        guard(async () => setAppointments(await api.listAppointments())),
        guard(async () => setNotifications(await api.listNotifications())),
        guard(async () => setVisits(await api.listVisits())),
        guard(async () => setMedicalRecords(await api.listReleasedRecords())),
        guard(async () => setInvoices(await api.listInvoices())),
        guard(async () => setPayments(await api.listPayments())),
        guard(async () => setAnnouncements(await api.listAnnouncements())),
      ]);
      if (!active) return;
      setLoading(false);
      if (failures.length >= 6) {
        // Fall back gracefully to preview demonstration fixtures so UI remains accessible
        setProfile((prev) => prev ?? demoPatientProfile);
        setAppointments((prev) => (prev.length ? prev : demoPortalAppointments));
        setNotifications((prev) => (prev.length ? prev : demoPortalNotifications));
        setVisits((prev) => (prev.length ? prev : demoVisits));
        setMedicalRecords((prev) => (prev.length ? prev : demoMedicalRecords));
        setInvoices((prev) => (prev.length ? prev : demoInvoices));
        setPayments((prev) => (prev.length ? prev : demoPayments));
        setAnnouncements((prev) => (prev.length ? prev : demoAnnouncements));
        setError("The patient portal could not connect to the live backend server. Displaying preview data.");
      } else if (failures.length > 0 && failures.length < 6) {
        // Soft notice for partial non-critical data
        setNotice("Some patient records or announcements could not be updated in real-time.");
      }
    };
    void load();
    return () => { active = false; };
  }, [section]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const diagnoses = medicalRecords.filter((record) => record.category === "Diagnosis");
  const results = medicalRecords.filter((record) => record.category === "Laboratory result");
  const prescriptions = medicalRecords.filter((record) => record.category === "Prescription");
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.totalAmount - invoice.paidAmount, 0);
  const upcomingAppointments = appointments.filter((appointment) => appointment.status === "Confirmed" || appointment.status === "Requested");

  const saveContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const updated = await patientPortalApi().updateContactInformation({
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        address: String(formData.get("address") ?? ""),
        emergencyContactName: String(formData.get("emergencyContactName") ?? ""),
        emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? ""),
      });
      setProfile(updated);
      setNotice("Contact information saved.");
    } catch {
      setError("The contact information could not be saved. Try again.");
    }
  };

  const requestAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = {
      date: String(formData.get("date") ?? ""),
      time: String(formData.get("time") ?? ""),
      department: String(formData.get("department") ?? ""),
      doctor: String(formData.get("doctor") ?? "Any available doctor"),
      reason: String(formData.get("reason") ?? ""),
    };
    if (!input.date || !input.department || !input.reason.trim()) {
      setNotice("Complete the required appointment fields.");
      return;
    }
    try {
      const created = await patientPortalApi().requestAppointment(input);
      setAppointments((current) => [created, ...current.filter((appointment) => appointment.id !== created.id)]);
      form.reset();
      setNotice("Appointment request saved.");
    } catch {
      setError("The appointment request could not be saved. The requested slot may be unavailable.");
    }
  };

  const requestChange = async (id: string, action: "cancel" | "reschedule") => {
    try {
      const updated = await patientPortalApi().requestAppointmentChange(id, action);
      setAppointments((current) => current.map((appointment) => (appointment.id === id ? updated : appointment)));
      setNotice(action === "cancel" ? `Cancellation request submitted (${updated.status}).` : "Rescheduling request submitted.");
    } catch {
      setError("The change request could not be submitted. Try again.");
    }
  };

  const submitSupport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const category = String(formData.get("type") ?? "Feedback") as "Feedback" | "Complaint" | "Support request";
    if (!subject || !message) {
      setNotice("Enter a subject and message before submitting.");
      return;
    }
    try {
      await patientPortalApi().submitSupportRequest({ category, subject, message });
      setSupportMessages((current) => [`${subject}: ${message}`, ...current]);
      form.reset();
      setNotice(demo ? "Your message has been recorded in demonstration data." : "Your message has been submitted to the hospital team.");
    } catch {
      setError("The request could not be submitted. Try again.");
    }
  };

  const markRead = async (id: string) => {
    try {
      await patientPortalApi().markNotificationRead(id);
      setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    } catch {
      setError("The notification could not be updated.");
    }
  };

  const markAllRead = async () => {
    try {
      await patientPortalApi().markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setNotice("All notifications marked as read.");
    } catch {
      setError("The notifications could not be updated.");
    }
  };

  const welcomeName = profile ? profile.fullName.split(" (")[0] : "";

  return (
    <div className="space-y-5">
      {demo ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100" role="note">
          Patient portal demo mode — all displayed data is synthetic. Set NEXT_PUBLIC_API_MODE to connect the backend.
        </div>
      ) : null}
      {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" role="status">{notice}</p> : null}
      {loading ? <p className="text-sm text-slate-500 dark:text-slate-400" role="progressbar">Loading patient data…</p> : null}

      {section === "overview" ? (
        <PageSection title={`Welcome${welcomeName ? `, ${welcomeName}` : ""}`} description={profile ? `Patient number: ${profile.patientNumber}` : undefined}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Upcoming appointments", String(upcomingAppointments.length), "/patient-portal/appointments"],
              ["Available records", String(visits.length + results.length + prescriptions.length), "/patient-portal/records"],
              ["Outstanding balance", `ETB ${outstanding.toLocaleString()}`, "/patient-portal/billing"],
              ["Unread notifications", String(unreadCount), "/patient-portal/notifications"],
            ].map(([label, value, href]) => (
              <Link key={label} href={href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-800 dark:bg-slate-900">
                <span className="block text-sm text-slate-600 dark:text-slate-300">{label}</span>
                <span className="mt-2 block text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
              </Link>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Patient profile">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{profile?.fullName ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Date of birth</dt><dd>{profile?.dateOfBirth ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Gender</dt><dd>{profile?.gender ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Phone</dt><dd>{profile?.phone ?? "—"}</dd></div>
              </dl>
              <Link className="mt-4 inline-block text-sm font-medium text-blue-700 underline dark:text-blue-300" href="/patient-portal/profile">Update permitted contact details</Link>
            </Panel>
            <Panel title="Upcoming appointments">
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
                    <div><p className="font-medium">{appointment.department}</p><p className="text-sm text-slate-500">{appointment.date} at {appointment.time} · {appointment.doctor}</p></div>
                    <StatusPill>{appointment.status}</StatusPill>
                  </div>
                ))}
                {upcomingAppointments.length === 0 && !loading ? <p className="text-sm text-slate-500">No upcoming appointments.</p> : null}
              </div>
            </Panel>
            <Panel title="Recent visits">
              <ul className="space-y-3 text-sm">{visits.slice(0, 3).map((visit) => <li key={visit.id} className="flex justify-between gap-3"><span>{visit.department} · {visit.patientVisibleSummary}</span><span className="whitespace-nowrap text-slate-500">{visit.date}</span></li>)}</ul>
            </Panel>
            <Panel title="Recent notifications">
              <ul className="space-y-3">{notifications.slice(0, 3).map((notification) => <li key={notification.id} className="flex items-start justify-between gap-3"><span><span className="block font-medium">{notification.title}</span><span className="text-sm text-slate-500">{notification.message}</span></span>{!notification.read ? <StatusPill>Unread</StatusPill> : null}</li>)}</ul>
            </Panel>
          </div>
        </PageSection>
      ) : null}

      {section === "profile" ? (
        <PageSection title="Patient profile" description="Review your profile and update permitted contact information. Identity details are read-only.">
          <Panel title="Personal and emergency contact information">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveContact}>
              <label className="text-sm">Name<input className={fieldClass} value={profile?.fullName ?? ""} readOnly /></label>
              <label className="text-sm">Patient number<input className={fieldClass} value={profile?.patientNumber ?? ""} readOnly /></label>
              <label className="text-sm">Date of birth<input className={fieldClass} value={profile?.dateOfBirth ?? ""} readOnly /></label>
              <label className="text-sm">Gender<input className={fieldClass} value={profile?.gender ?? ""} readOnly /></label>
              <label className="text-sm">Phone<input className={fieldClass} name="phone" type="tel" required defaultValue={profile?.phone ?? ""} /></label>
              <label className="text-sm">Email<input className={fieldClass} name="email" type="email" defaultValue={profile?.email ?? ""} /></label>
              <label className="text-sm sm:col-span-2">Address<input className={fieldClass} name="address" defaultValue={profile?.address ?? ""} /></label>
              <label className="text-sm">Emergency contact name<input className={fieldClass} name="emergencyContactName" required defaultValue={profile?.emergencyContactName ?? ""} /></label>
              <label className="text-sm">Emergency contact phone<input className={fieldClass} name="emergencyContactPhone" type="tel" required defaultValue={profile?.emergencyContactPhone ?? ""} /></label>
              <div className="sm:col-span-2"><button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2" type="submit">Save contact information</button></div>
            </form>
          </Panel>
        </PageSection>
      ) : null}

      {section === "appointments" ? (
        <PageSection title="Appointments" description="Request, review, cancel, or reschedule appointments. Booking and availability are confirmed by the hospital backend.">
          <Panel title="Request an appointment">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={requestAppointment}>
              <label className="text-sm">Department *<select className={fieldClass} name="department" required defaultValue=""><option value="" disabled>Select department</option>{["Internal Medicine", "Pediatrics", "Surgery", "Gynecology & Obstetrics", "Dentistry", "Ophthalmology"].map((department) => <option key={department}>{department}</option>)}</select></label>
              <label className="text-sm">Doctor<select className={fieldClass} name="doctor" defaultValue="Any available doctor"><option>Any available doctor</option><option>Dr. Demo One</option><option>Dr. Demo Two</option></select></label>
              <label className="text-sm">Preferred date *<input className={fieldClass} name="date" type="date" required /></label>
              <label className="text-sm">Preferred time slot<select className={fieldClass} name="time" defaultValue="09:30"><option>09:30</option><option>10:30</option><option>13:00</option><option>15:00</option></select></label>
              <label className="text-sm sm:col-span-2">Reason for appointment *<textarea className={fieldClass} name="reason" required rows={3} /></label>
              <div className="sm:col-span-2"><button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" type="submit">Submit appointment request</button></div>
            </form>
          </Panel>
          <Panel title="Appointment history and change requests">
            <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Date / time</th><th className="p-3">Department / doctor</th><th className="p-3">Reason</th><th className="p-3">Status</th><th className="p-3">Requests</th></tr></thead><tbody>{appointments.map((appointment) => <tr key={appointment.id} className="border-b last:border-0"><td className="p-3">{appointment.date} · {appointment.time}</td><td className="p-3">{appointment.department}<br /><span className="text-xs text-slate-500">{appointment.doctor}</span></td><td className="p-3">{appointment.reason}</td><td className="p-3"><StatusPill>{appointment.status}</StatusPill></td><td className="p-3"><div className="flex gap-2"><button className="text-blue-700 underline disabled:text-slate-400 dark:text-blue-300" disabled={!["Confirmed", "Requested"].includes(appointment.status)} onClick={() => requestChange(appointment.id, "reschedule")} type="button">Request reschedule</button><button className="text-blue-700 underline disabled:text-slate-400 dark:text-blue-300" disabled={!["Confirmed", "Requested"].includes(appointment.status)} onClick={() => requestChange(appointment.id, "cancel")} type="button">Request cancellation</button></div></td></tr>)}</tbody></table></div>
          </Panel>
        </PageSection>
      ) : null}

      {section === "records" ? (
        <PageSection title="Medical records" description="Only patient-authorized summaries and released documents are shown. Restricted internal clinical notes are not included.">
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Visit history"><ul className="space-y-3">{visits.map((visit) => <li key={visit.id} className="border-b pb-3 last:border-0"><p className="font-medium">{visit.department} · {visit.date}</p><p className="text-sm text-slate-500">{visit.patientVisibleSummary} · {visit.clinician}</p></li>)}</ul></Panel>
            <Panel title="Authorized diagnosis information"><ul className="space-y-3">{diagnoses.map((diagnosis) => <li key={diagnosis.id} className="flex justify-between gap-2"><span>{diagnosis.title}</span><span className="text-sm text-slate-500">{diagnosis.date}</span></li>)}</ul></Panel>
            <Panel title="Laboratory results"><ul className="space-y-3">{results.map((result) => <li key={result.id} className="flex justify-between gap-2"><span>{result.title}</span><span className="text-sm text-slate-500">{result.date}</span></li>)}</ul></Panel>
            <Panel title="Prescriptions"><ul className="space-y-3">{prescriptions.map((prescription) => <li key={prescription.id}><p className="font-medium">{prescription.title}</p><p className="text-sm text-slate-500">{prescription.date}</p></li>)}</ul></Panel>
          </div>
          {demo ? (
            <Panel title="Released documents">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">{demoPortalDocuments.map((document) => <li key={document.fileName} className="flex flex-wrap items-center justify-between gap-3 py-3"><span>{document.name}</span><a className="font-medium text-blue-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300" href={`data:text/plain;charset=utf-8,${encodeURIComponent(document.content)}`} download={document.fileName}>Download demo document</a></li>)}</ul>
            </Panel>
          ) : null}
        </PageSection>
      ) : null}

      {section === "billing" ? (
        <PageSection title="Billing and insurance" description="Your invoices and payment history. No financial transaction can be initiated from this portal.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel title="Outstanding balance"><p className="text-2xl font-bold">ETB {outstanding.toLocaleString()}</p></Panel>
            <Panel title="Insurance"><p className="font-medium">{demo ? "Nyala Insurance (demo)" : "Verified by the finance office"}</p><p className="mt-1 text-sm text-slate-500">{demo ? "Policy: NYL-DEMO-88231 · Eligibility must be verified by the payer." : "Insurance eligibility is verified by the hospital payer office."}</p></Panel>
            <Panel title="Payment history"><p className="text-sm text-slate-600 dark:text-slate-300">{payments.length} payment receipts available.</p></Panel>
          </div>
          <Panel title="Invoices and receipts">
            <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3">Amount (ETB)</th><th className="p-3">Paid</th><th className="p-3">Status</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-b last:border-0"><td className="p-3">{invoice.id}</td><td className="p-3">{invoice.issuedAt}</td><td className="p-3">{invoice.description}</td><td className="p-3">{Number(invoice.totalAmount).toLocaleString()}</td><td className="p-3">{Number(invoice.paidAmount).toLocaleString()}</td><td className="p-3"><StatusPill>{invoice.status}</StatusPill></td></tr>)}</tbody></table></div>
            <h3 className="mb-2 mt-6 font-semibold">Payment history</h3>
            <ul className="space-y-2">{payments.map((payment) => <li key={payment.id} className="flex justify-between gap-3 text-sm"><span>{payment.id} · {payment.method} · {payment.paidAt}</span><span>ETB {Number(payment.amount).toLocaleString()}</span></li>)}</ul>
          </Panel>
        </PageSection>
      ) : null}

      {section === "notifications" ? (
        <PageSection title="Notifications" description="Review hospital notices and personal portal messages.">
          <Panel title={`Notification history · ${unreadCount} unread`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <label className="text-sm">Category
                <select aria-label="Notification category" className={`${fieldClass} mt-1 min-w-48`} onChange={(event) => setNotificationCategory(event.currentTarget.value)} value={notificationCategory}>
                  <option value="">All categories</option><option>Appointments</option><option>Results</option><option>Billing</option><option>Hospital</option>
                </select>
              </label>
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:hover:bg-slate-800" disabled={unreadCount === 0} onClick={markAllRead} type="button">Mark all as read</button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">{notifications.filter((notification) => !notificationCategory || notification.category === notificationCategory).map((notification) => <li key={notification.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div><p className="font-semibold">{notification.title} {!notification.read ? <StatusPill>Unread</StatusPill> : null}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</p><p className="mt-1 text-xs text-slate-500">{notification.category} · {notification.createdAt}</p></div>{!notification.read ? <button className="text-sm font-medium text-blue-700 underline dark:text-blue-300" onClick={() => markRead(notification.id)} type="button">Mark read</button> : <span className="text-xs text-slate-500">Read</span>}</li>)}</ul>
          </Panel>
        </PageSection>
      ) : null}

      {section === "support" ? (
        <PageSection title="Communication and support" description="Send feedback, file a complaint, or request portal support.">
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Hospital announcements">
              <ul className="space-y-4">{announcements.map((announcement) => <li key={announcement.id}><p className="font-medium">{announcement.title}</p><p className="text-sm text-slate-500">{announcement.message} · {announcement.publishedAt}</p></li>)}</ul>
              <div className="mt-5 border-t pt-4 text-sm"><p className="font-medium">Contact information</p><p className="mt-1 text-slate-600 dark:text-slate-300">Gondar Hospital · Information desk: +251 900 000 000{demo ? " (demo)" : ""}</p></div>
            </Panel>
            <Panel title="Feedback, complaints, and support requests">
              <form className="space-y-4" onSubmit={submitSupport}>
                <label className="block text-sm">Request type<select className={fieldClass} name="type"><option>Feedback</option><option>Complaint</option><option>Support request</option></select></label>
                <label className="block text-sm">Subject *<input className={fieldClass} name="subject" required maxLength={120} /></label>
                <label className="block text-sm">Message *<textarea className={fieldClass} name="message" rows={4} required maxLength={1000} /></label>
                <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" type="submit">Submit request</button>
              </form>
              {supportMessages.length ? <div className="mt-5"><h3 className="font-semibold">Your submitted requests</h3><ul className="mt-2 list-inside list-disc text-sm text-slate-600 dark:text-slate-300">{supportMessages.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul></div> : null}
            </Panel>
          </div>
        </PageSection>
      ) : null}
    </div>
  );
}
