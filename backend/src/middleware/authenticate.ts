import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

const roleValues = new Set<string>(Object.values(UserRole));
let authDatabase: PrismaClient | null = null;

export function setAuthDatabase(database: PrismaClient | null) {
  authDatabase = database;
}

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.header("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const cookie = request.header("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("ghms_access="))?.slice("ghms_access=".length);
  const token = bearer ?? cookie;
  if (!token) return next(new HttpError(401, "Authentication is required", "UNAUTHENTICATED"));

  try {
    const claims = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
      issuer: env.JWT_ISSUER,
      audience: "ghms-web",
    }) as JwtPayload;
    if (typeof claims.sub !== "string" || typeof claims.role !== "string" || !roleValues.has(claims.role)) {
      throw new Error("Invalid access token claims");
    }

    let role = claims.role as UserRole;
    let authoritativeDepartment = typeof claims.department === "string" ? claims.department : undefined;

    if (authDatabase) {
      const user = await authDatabase.user.findUnique({
        where: { id: claims.sub },
        select: { status: true, hospitalId: true, role: true, department: true },
      });
      if (!user || user.status !== "ACTIVE") {
        return next(new HttpError(403, "This account is not active. Contact the hospital registration desk.", "ACCOUNT_NOT_ACTIVE"));
      }
      role = user.role;
      if (user.department) {
        authoritativeDepartment = user.department;
      }
      if (user.hospitalId !== claims.hospitalId) {
        throw new HttpError(401, "Token tenant does not match the active account", "TENANT_MISMATCH");
      }
      claims.hospitalId = user.hospitalId ?? undefined;
    }

    request.actor = {
      userId: claims.sub,
      role,
      ...(typeof claims.patientId === "string" ? { patientId: claims.patientId } : {}),
      ...(authoritativeDepartment ? { department: authoritativeDepartment } : {}),
      ...(typeof claims.hospitalId === "string" ? { hospitalId: claims.hospitalId } : {}),
    };
    return next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(401, "Authentication is required", "UNAUTHENTICATED"));
  }
}

export const rolePermissions: Record<UserRole, ReadonlySet<string>> = {
  SUPER_ADMIN: new Set([
    "platform.manage",
    "tenants.read",
    "tenants.manage",
    "subscriptions.read",
    "subscriptions.manage",
    "saas.plans.manage",
    "platform.settings.manage",
    "users.read",
    "departments.read",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
  ]),
  ADMINISTRATOR: new Set([
    "users.read",
    "users.manage",
    "roles.read",
    "roles.manage",
    "permissions.read",
    "permissions.manage",
    "departments.read",
    "departments.manage",
    "doctors.read",
    "doctors.manage",
    "audit_logs.read",
    "hospital.settings.read",
    "hospital.settings.manage",
    "reports.read",
    "reports.operational.read",
    "saas.subscription.manage",
    "media.manage",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
  ]),
  PATIENT: new Set([
    "appointments.create",
    "appointments.read.own",
    "appointments.update.own",
    "queue.read.public",
    "portal.profile.read",
    "portal.profile.update",
    "portal.records.read",
    "portal.billing.read",
    "payments.pay.own",
  ]),
  DOCTOR: new Set([
    "appointments.read.department",
    "appointments.update.department",
    "queue.read.department",
    "queue.manage.department",
    "doctors.read",
    "clinical.read",
    "clinical.encounters.write",
    "clinical.consultations.write",
    "clinical.diagnoses.write",
    "clinical.allergies.write",
    "clinical.treatment.write",
    "clinical.referrals.write",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "emergency.read",
    "emergency.manage",
    "emergency.triage",
    "emergency.treatment",
    "departments.read",
    "departments.manage",
    "laboratory.orders.read",
    "laboratory.orders.create",
    "radiology.read",
    "radiology.requests.create",
  ]),
  NURSE: new Set([
    "appointments.read.department",
    "appointments.create",
    "appointments.update.department",
    "queue.read.department",
    "queue.manage.department",
    "doctors.read",
    "clinical.read",
    "clinical.nursing.write",
    "clinical.vitals.write",
    "clinical.allergies.write",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "emergency.read",
    "emergency.manage",
    "emergency.triage",
    "emergency.treatment",
    "departments.read",
    "laboratory.orders.read",
    "inpatient.read",
    "inpatient.vitals.write",
  ]),
  RECEPTIONIST: new Set([
    "appointments.read.all",
    "appointments.create",
    "appointments.update.all",
    "queue.read.all",
    "queue.manage.all",
    "doctors.read",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "emergency.read",
    "emergency.manage",
    "departments.read",
  ]),
  LABORATORY_TECHNICIAN: new Set([
    "appointments.read.department",
    "queue.read.department",
    "doctors.read",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "laboratory.read",
    "laboratory.manage",
    "laboratory.orders.read",
    "laboratory.orders.manage",
    "laboratory.results.write",
    "laboratory.results.approve",
    "laboratory.results.release",
  ]),
  RADIOLOGY_TECHNICIAN: new Set([
    "appointments.read.department",
    "queue.read.department",
    "doctors.read",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "radiology.read",
    "radiology.manage",
    "radiology.reports.write",
    "radiology.reports.approve",
    "radiology.reports.release",
  ]),
  PHARMACIST: new Set([
    "appointments.read.department",
    "doctors.read",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "pharmacy.read",
    "pharmacy.manage",
    "pharmacy.prescriptions.read",
    "pharmacy.prescriptions.dispense",
    "pharmacy.inventory.read",
    "pharmacy.inventory.manage",
    "departments.read",
  ]),
  FINANCE_OFFICER: new Set([
    "doctors.read",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "billing.read",
    "billing.manage",
    "billing.invoices.create",
    "billing.invoices.read",
    "billing.payments.process",
    "billing.insurance.manage",
    "departments.read",
  ]),
  HR_OFFICER: new Set([
    "doctors.read",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "hr.read",
    "hr.manage",
    "hr.staff.read",
    "hr.staff.manage",
    "hr.attendance.manage",
    "hr.leave.manage",
    "departments.read",
  ]),
  DEPARTMENT_HEAD: new Set([
    "appointments.read.department",
    "appointments.create",
    "appointments.update.department",
    "queue.read.department",
    "queue.manage.department",
    "doctors.read",
    "clinical.read",
    "clinical.encounters.write",
    "clinical.consultations.write",
    "clinical.diagnoses.write",
    "clinical.allergies.write",
    "clinical.treatment.write",
    "clinical.referrals.write",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "emergency.read",
    "emergency.manage",
    "emergency.triage",
    "emergency.treatment",
    "departments.read",
    "departments.manage",
    "laboratory.orders.read",
    "laboratory.orders.create",
    "radiology.read",
  ]),
  HOSPITAL_STAFF: new Set([
    "appointments.read.department",
    "appointments.create",
    "queue.read.department",
    "doctors.read",
    "clinical.read",
    "clinical.messages.read",
    "clinical.messages.send",
    "clinical.messages.reply",
    "emergency.read",
    "departments.read",
  ]),
};

export function requirePermission(...permissions: string[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const role = request.actor?.role;
    if (!role) return next(new HttpError(401, "Authentication is required", "UNAUTHENTICATED"));
    const allowed = rolePermissions[role];
    if (allowed.has("*") || permissions.some((permission) => allowed.has(permission))) return next();
    return next(new HttpError(403, "You are not authorized to perform this action", "FORBIDDEN"));
  };
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.actor) return next(new HttpError(401, "Authentication is required", "UNAUTHENTICATED"));
    if (!roles.includes(request.actor.role)) return next(new HttpError(403, "You are not authorized to perform this action", "FORBIDDEN"));
    return next();
  };
}

export function requireTenant(request: Request, _response: Response, next: NextFunction) {
  if (!request.actor) return next(new HttpError(401, "Authentication is required", "UNAUTHENTICATED"));
  if (request.actor.role === UserRole.SUPER_ADMIN) return next();
  if (!request.actor.hospitalId) {
    return next(new HttpError(403, "No tenant association found for this user", "TENANT_REQUIRED"));
  }
  return next();
}

export function requireSuperAdmin(request: Request, _response: Response, next: NextFunction) {
  if (!request.actor) return next(new HttpError(401, "Authentication is required", "UNAUTHENTICATED"));
  if (request.actor.role !== UserRole.SUPER_ADMIN) {
    return next(new HttpError(403, "Platform super administrator authorization required", "FORBIDDEN"));
  }
  return next();
}

/** Explicit alias for authenticate middleware for clear intent */
export const requireAuth = authenticate;

/**
 * Enforces department-level access control.
 * Admins and Super Admins bypass department boundaries for executive oversight.
 */
export function requireDepartmentAccess(...departments: string[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const actor = request.actor;
    if (!actor) return next(new HttpError(401, "Authentication is required", "UNAUTHENTICATED"));
    if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMINISTRATOR) {
      return next();
    }
    const actorDept = actor.department?.toLowerCase();
    if (actorDept && departments.some((d) => d.toLowerCase() === actorDept)) {
      return next();
    }
    return next(new HttpError(403, "Access restricted to department personnel", "FORBIDDEN"));
  };
}
