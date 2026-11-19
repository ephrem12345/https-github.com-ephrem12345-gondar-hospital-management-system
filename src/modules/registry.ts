import type { ModuleScreen } from "@/modules/types";
import { patientServicesScreens } from "@/modules/patient-services";
import { clinicalScreens } from "@/modules/clinical";
import { diagnosticsScreens } from "@/modules/diagnostics";
import { pharmacyScreens } from "@/modules/pharmacy";
import { facilityScreens } from "@/modules/facilities";
import { financeScreens } from "@/modules/finance";
import { hrScreens } from "@/modules/hr";
import { resourceScreens } from "@/modules/resources";
import { managementScreens } from "@/modules/management";
import { adminScreens, ROLES, permissionRows } from "@/modules/admin";
import { billingScreens } from "@/modules/billing";

/**
 * Route → screen registry. One entry per sidebar navigation item; the
 * catch-all route resolves the entry and renders the matching template.
 */
const groups = [
  patientServicesScreens,
  clinicalScreens,
  diagnosticsScreens,
  pharmacyScreens,
  facilityScreens,
  financeScreens,
  hrScreens,
  resourceScreens,
  managementScreens,
  adminScreens,
  billingScreens,
];

export const screenRegistry: Record<string, ModuleScreen> = Object.assign(
  {},
  ...groups,
);

export { ROLES, permissionRows };
