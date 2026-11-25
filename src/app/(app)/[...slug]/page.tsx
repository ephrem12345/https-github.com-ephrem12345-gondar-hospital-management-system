"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import type { DepartmentId } from "@/services/department-workflows";
import type { DiagnosticWorkflowSection } from "@/services/diagnostic-workflows";
import type { FacilityWorkflowSection, PharmacyWorkflowSection } from "@/services/hospital-operations";
import { resolveNav } from "@/data/navigation";
import { screenRegistry, ROLES, permissionRows } from "@/modules/registry";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { authService } from "@/services";
import { canAccessRoute } from "@/config/route-permissions";
import AccessDeniedPage from "@/app/(app)/access-denied/page";

const PageLoader = () => <LoadingState variant="page" />;

const PatientManagementScreen = dynamic(
  () => import("@/components/templates/PatientManagementScreen").then((m) => m.PatientManagementScreen),
  { loading: PageLoader }
);
const GenericListScreen = dynamic(
  () => import("@/components/templates/PatientManagementScreen").then((m) => m.GenericListScreen),
  { loading: PageLoader }
);
const PatientRegistrationScreen = dynamic(
  () => import("@/components/templates/PatientRegistrationScreen").then((m) => m.PatientRegistrationScreen),
  { loading: PageLoader }
);
const FormTemplate = dynamic(
  () => import("@/components/templates/FormTemplate").then((m) => m.FormTemplate),
  { loading: PageLoader }
);
const BoardTemplate = dynamic(
  () => import("@/components/templates/BoardTemplate").then((m) => m.BoardTemplate),
  { loading: PageLoader }
);
const GridTemplate = dynamic(
  () => import("@/components/templates/GridTemplate").then((m) => m.GridTemplate),
  { loading: PageLoader }
);
const AnalyticsTemplate = dynamic(
  () => import("@/components/templates/AnalyticsTemplate").then((m) => m.AnalyticsTemplate),
  { loading: PageLoader }
);
const SettingsTemplate = dynamic(
  () => import("@/components/templates/SettingsTemplate").then((m) => m.SettingsTemplate),
  { loading: PageLoader }
);
const PermissionsMatrix = dynamic(
  () => import("@/components/templates/PermissionsMatrix").then((m) => m.PermissionsMatrix),
  { loading: PageLoader }
);
const DepartmentWorkspaceScreen = dynamic(
  () => import("@/components/templates/DepartmentWorkspaceScreen").then((m) => m.DepartmentWorkspaceScreen),
  { loading: PageLoader }
);
const AppointmentQueueManagementScreen = dynamic(
  () => import("@/components/templates/AppointmentQueueManagementScreen").then((m) => m.AppointmentQueueManagementScreen),
  { loading: PageLoader }
);
const ClinicalServicesScreen = dynamic(
  () => import("@/components/templates/ClinicalServicesScreen").then((m) => m.ClinicalServicesScreen),
  { loading: PageLoader }
);
const DepartmentWorkflowWorkspaceScreen = dynamic(
  () => import("@/components/templates/DepartmentWorkflowWorkspaceScreen").then((m) => m.DepartmentWorkflowWorkspaceScreen),
  { loading: PageLoader }
);
const DiagnosticServicesScreen = dynamic(
  () => import("@/components/templates/DiagnosticServicesScreen").then((m) => m.DiagnosticServicesScreen),
  { loading: PageLoader }
);
const PharmacyManagementScreen = dynamic(
  () => import("@/components/templates/PharmacyManagementScreen").then((m) => m.PharmacyManagementScreen),
  { loading: PageLoader }
);
const HospitalResourcesScreen = dynamic(
  () => import("@/components/templates/HospitalResourcesScreen").then((m) => m.HospitalResourcesScreen),
  { loading: PageLoader }
);
const ClinicalMessagingHub = dynamic(
  () => import("@/components/messaging/ClinicalMessagingHub").then((m) => m.ClinicalMessagingHub),
  { loading: PageLoader }
);
const ChapaCheckoutScreen = dynamic(
  () => import("@/components/billing/ChapaCheckoutScreen").then((m) => m.ChapaCheckoutScreen),
  { loading: PageLoader }
);
const SubscriptionScreen = dynamic(
  () => import("@/components/billing/SubscriptionScreen").then((m) => m.SubscriptionScreen),
  { loading: PageLoader }
);
const MediaLibraryScreen = dynamic(
  () => import("@/components/billing/MediaLibraryScreen").then((m) => m.MediaLibraryScreen),
  { loading: PageLoader }
);
const PlatformAdminScreen = dynamic(
  () => import("@/components/billing/PlatformAdminScreen").then((m) => m.PlatformAdminScreen),
  { loading: PageLoader }
);

/**
 * Renders every registered module screen. Screens are data-driven
 * configurations from `src/modules/*` composed with shared templates.
 */
export default function ModuleScreenPage() {
  const pathname = usePathname() ?? "";
  const { t } = useTranslation();
  const nav = resolveNav(pathname);

  const currentUser = authService.currentUser();
  if (!currentUser || !canAccessRoute(pathname, currentUser.role)) {
    return <AccessDeniedPage />;
  }

  if (pathname === "/emergency") {
    return <DepartmentWorkflowWorkspaceScreen departmentId="emergency" />;
  }

  // Department workspace pages resolve by slug (e.g. /departments/icu).
  if (pathname.startsWith("/departments/")) {
    const deptId = pathname.replace("/departments/", "");
    const departmentIds: DepartmentId[] = [
      "internal-medicine",
      "surgery",
      "pediatrics",
      "gynecology-obstetrics",
      "orthopedics",
      "dentistry",
      "ophthalmology",
      "dermatology",
      "psychiatry",
      "icu",
      "physiotherapy",
    ];
    if (departmentIds.includes(deptId as DepartmentId)) {
      return <DepartmentWorkflowWorkspaceScreen departmentId={deptId as DepartmentId} />;
    }
    return <DepartmentWorkspaceScreen deptId={deptId} />;
  }

  const pharmacySections: Record<string, PharmacyWorkflowSection> = {
    "/pharmacy": "dashboard",
    "/medicines": "medicines",
    "/inventory": "batches",
    "/prescriptions": "prescriptions",
    "/dispensing": "dispensing",
    "/suppliers": "suppliers",
    "/procurement": "procurement",
  };
  const pharmacySection = pharmacySections[pathname];
  if (pharmacySection) {
    return (
      <PharmacyManagementScreen
        title={nav?.item.label ?? "Pharmacy"}
        initialSection={pharmacySection}
      />
    );
  }

  const facilitySections: Record<string, FacilityWorkflowSection> = {
    "/inpatient": "inpatient",
    "/admissions": "admissions",
    "/wards": "wards",
    "/beds": "beds",
    "/discharges": "discharges",
    "/operating-rooms": "operating-rooms",
    "/ambulance": "ambulance",
    "/general-inventory": "general-inventory",
    "/assets": "assets",
    "/maintenance": "maintenance",
  };
  const facilitySection = facilitySections[pathname];
  if (facilitySection) {
    return (
      <HospitalResourcesScreen
        title={nav?.item.label ?? "Hospital Resources"}
        initialSection={facilitySection}
      />
    );
  }

  const diagnosticSections: Record<string, DiagnosticWorkflowSection> = {
    "/laboratory": "laboratory",
    "/laboratory-orders": "orders",
    "/specimen-management": "specimens",
    "/laboratory-results": "results",
    "/radiology": "radiology",
    "/imaging-reports": "imaging-reports",
    "/blood-bank": "blood-bank",
  };
  const diagnosticSection = diagnosticSections[pathname];
  if (diagnosticSection) {
    return (
      <DiagnosticServicesScreen
        title={nav?.item.label ?? "Diagnostic Services"}
        initialSection={diagnosticSection}
      />
    );
  }

  const clinicalSections: Record<string, "overview" | "nursing" | "vitals" | "diagnoses" | "referrals"> = {
    "/medical-records": "overview",
    "/nurses": "nursing",
    "/vital-signs": "vitals",
    "/diagnoses": "diagnoses",
    "/referrals": "referrals",
  };
  const clinicalSection = clinicalSections[pathname];
  if (clinicalSection) {
    return (
      <ClinicalServicesScreen
        title={nav?.item.label ?? "Clinical Services"}
        initialSection={clinicalSection}
      />
    );
  }

  if (!nav) {
    return (
      <Card>
        <EmptyState
          icon={Compass}
          title={t("notFound.title")}
          description={t("notFound.body")}
          action={
            <Button href="/" leftIcon={undefined}>
              {t("placeholder.backToDashboard")}
            </Button>
          }
        />
      </Card>
    );
  }

  const title = nav.item.label;
  const entry = screenRegistry[pathname];

  // Unregistered items (e.g. future modules) fall back to an explicit
  // "under development" state instead of a dead page.
  if (!entry) {
    return (
      <Card>
        <EmptyState
          icon={nav.item.icon}
          title={`${title} — ${t("placeholder.underDevelopment")}`}
          description={t("placeholder.underDevelopmentBody")}
          action={<Button href="/">{t("placeholder.backToDashboard")}</Button>}
        />
      </Card>
    );
  }

  switch (entry.kind) {
    case "custom": {
      if (entry.screen === "patient-management") {
        return <PatientManagementScreen title={title} screen={{ description: "", columns: [], data: [], keyExtractor: () => "" }} />;
      }
      if (entry.screen === "patient-registration") {
        return <PatientRegistrationScreen title={title} />;
      }
      if (entry.screen === "appointment-management") {
        return <AppointmentQueueManagementScreen title={title} view="appointments" />;
      }
      if (entry.screen === "queue-management") {
        return <AppointmentQueueManagementScreen title={title} view="queue" />;
      }
      if (entry.screen === "waiting-room") {
        return <AppointmentQueueManagementScreen title={title} view="waiting-room" />;
      }
      if (entry.screen === "departments-workspace") {
        return <DepartmentWorkflowWorkspaceScreen departmentId={nav.item.id as DepartmentId} />;
      }
      if (entry.screen === "clinical-messages") {
        return <ClinicalMessagingHub />;
      }
      if (entry.screen === "chapa-checkout") {
        return <Suspense fallback={<PageLoader />}><ChapaCheckoutScreen title={title} /></Suspense>;
      }
      if (entry.screen === "subscription") {
        return <Suspense fallback={<PageLoader />}><SubscriptionScreen title={title} /></Suspense>;
      }
      if (entry.screen === "media-library") {
        return <Suspense fallback={<PageLoader />}><MediaLibraryScreen title={title} /></Suspense>;
      }
      if (entry.screen === "platform-admin") {
        return <Suspense fallback={<PageLoader />}><PlatformAdminScreen title={title} /></Suspense>;
      }
      if (entry.screen === "permissions") {
        return (
          <PermissionsMatrix
            title={title}
            description="Granular access control per role. Toggle permissions and save to apply staged changes."
            roles={ROLES}
            rows={permissionRows}
          />
        );
      }
      return null;
    }
    case "list":
      return <GenericListScreen title={title} screen={entry.screen} />;
    case "form":
      return <FormTemplate title={title} screen={entry.screen} />;
    case "board":
      return <BoardTemplate title={title} screen={entry.screen} />;
    case "grid":
      return <GridTemplate title={title} screen={entry.screen} />;
    case "analytics":
      return <AnalyticsTemplate title={title} screen={entry.screen} />;
    case "settings":
      return <SettingsTemplate title={title} screen={entry.screen} />;
    default:
      return null;
  }
}
