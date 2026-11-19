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
    const claims = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    if (typeof claims.sub !== "string" || typeof claims.role !== "string" || !roleValues.has(claims.role)) {
      throw new Error("Invalid access token claims");
    }

    if (authDatabase) {
      const user = await authDatabase.user.findUnique({
        where: { id: claims.sub },
        select: { status: true, hospitalId: true },
      });
      if (!user || user.status !== "ACTIVE") {
        return next(new HttpError(403, "This account is not active. Contact the hospital registration desk.", "ACCOUNT_NOT_ACTIVE"));
      }
      if (user.hospitalId && !claims.hospitalId) {
        claims.hospitalId = user.hospitalId;
      }
    }

    request.actor = {
      userId: claims.sub,
      role: claims.role as UserRole,
      ...(typeof claims.patientId === "string" ? { patientId: claims.patientId } : {}),
      ...(typeof claims.department === "string" ? { department: claims.department } : {}),
      ...(typeof claims.hospitalId === "string" ? { hospitalId: claims.hospitalId } : {}),
    };
    return next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(401, "Authentication is required", "UNAUTHENTICATED"));
  }
}

const rolePermissions: Record<UserRole, ReadonlySet<string>> = {
  SUPER_ADMIN: new Set(["*"]),
  ADMINISTRATOR: new Set(["*"]),
  PATIENT: new Set(["appointments.create", "appointments.read.own", "appointments.update.own", "queue.read.public"]),
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
    "departments.manage",
    "laboratory.orders.read",
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
