/**
 * English dictionary (default language).
 * Keys are dot-namespaced: <area>.<context>.<element>
 */
export const en = {
  // Common
  "common.appName": "GHMS",
  "common.appFullName": "Gondar Hospital Management System",
  "common.hospitalName": "Gondar Hospital",
  "common.search": "Search",
  "common.actions": "Actions",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.close": "Close",
  "common.back": "Back",
  "common.viewAll": "View all",
  "common.loading": "Loading…",
  "common.language": "Language",
  "common.theme": "Theme",
  "common.light": "Light",
  "common.dark": "Dark",
  "common.system": "System",
  "common.english": "English",
  "common.amharic": "አማርኛ",
  "common.logout": "Log out",
  "common.profile": "Profile",
  "common.settings": "Settings",
  "common.showing": "Showing",
  "common.of": "of",
  "common.noResults": "No results found",

  // Topbar
  "topbar.searchPlaceholder": "Search patients, modules, pages…",
  "topbar.searchHint": "Type to search the application",
  "topbar.notifications": "Notifications",
  "topbar.markAllRead": "Mark all as read",
  "topbar.noNotifications": "You're all caught up",
  "topbar.profile": "Account",

  // Sidebar
  "sidebar.collapse": "Collapse sidebar",
  "sidebar.expand": "Expand sidebar",
  "sidebar.closeMenu": "Close menu",

  // Dashboard
  "dashboard.title": "Dashboard",
  "dashboard.subtitle":
    "Real-time overview of hospital operations and key metrics.",
  "dashboard.stat.totalPatients": "Total Patients",
  "dashboard.stat.appointmentsToday": "Appointments Today",
  "dashboard.stat.availableBeds": "Available Beds",
  "dashboard.stat.revenueMonth": "Revenue (This Month)",
  "dashboard.stat.vsLastMonth": "vs last month",
  "dashboard.chart.admissions": "Patient Admissions",
  "dashboard.chart.admissionsSub": "Monthly admissions and discharges, last 12 months",
  "dashboard.chart.admissionsAxis": "Patients",
  "dashboard.chart.departments": "Patients by Department",
  "dashboard.chart.departmentsSub": "Current distribution across major departments",
  "dashboard.chart.legendAdmitted": "Admitted",
  "dashboard.chart.legendDischarged": "Discharged",
  "dashboard.recentPatients": "Recent Patients",
  "dashboard.recentPatientsSub": "Latest registrations across all departments",
  "dashboard.upcomingAppointments": "Today's Appointments",

  // Table headers
  "table.patient": "Patient",
  "table.patientId": "Patient ID",
  "table.department": "Department",
  "table.status": "Status",
  "table.lastVisit": "Last Visit",
  "table.time": "Time",
  "table.doctor": "Doctor",
  "table.type": "Type",

  // Placeholder pages
  "placeholder.moduleTitle": "Module",
  "placeholder.underDevelopment": "Module under development",
  "placeholder.underDevelopmentBody":
    "This module is part of an upcoming development phase. The layout, navigation and shared components are already wired up — data screens will be built on this foundation.",
  "placeholder.backToDashboard": "Back to dashboard",

  // Errors
  "notFound.title": "Page not found",
  "notFound.body": "The page you are looking for does not exist or has been moved.",
} as const;

export type Dictionary = Record<keyof typeof en, string>;
