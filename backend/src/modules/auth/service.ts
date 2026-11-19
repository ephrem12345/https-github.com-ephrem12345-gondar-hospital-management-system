import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { PrismaClient, User, UserRole, AccountStatus } from "@prisma/client";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";

const ACCESS_COOKIE = "ghms_access";
const REFRESH_COOKIE = "ghms_refresh";
const ONE_DAY = 24 * 60 * 60;
const REFRESH_TTL = 30 * ONE_DAY;

type LockoutEntry = {
  count: number;
  lockedUntil: number | null;
};

const failedLoginTracker = new Map<string, LockoutEntry>();
const MAX_CONSECUTIVE_FAILED_LOGINS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

type UserWithPatient = User & {
  patient: { id: string; department: string; phone: string } | null;
  doctor: { department: string } | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookie(name: string, value: string, maxAge: number) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${env.COOKIE_SECURE ? "; Secure" : ""}`;
}

function clearCookie(name: string, path = "/") {
  return `${name}=; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=0${env.COOKIE_SECURE ? "; Secure" : ""}`;
}

function getCookie(header: string | undefined, name: string) {
  return header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function roleLabel(role: UserRole) {
  return role.toLowerCase().split("_").map((part) => part[0]!.toUpperCase() + part.slice(1)).join(" ");
}

function presentUser(user: UserWithPatient) {
  const name = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
  return {
    id: user.id,
    name,
    role: roleLabel(user.role),
    department: user.department ?? user.patient?.department ?? user.doctor?.department ?? "—",
    email: user.email,
    phone: user.phone ?? user.patient?.phone ?? "",
    initials: `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase(),
  };
}

export class AuthService {
  constructor(private readonly database: PrismaClient) {}

  private async issueAccessToken(user: UserWithPatient) {
    const department = user.department ?? user.doctor?.department;
    return jwt.sign({
      role: user.role,
      ...(user.patient ? { patientId: user.patient.id } : {}),
      ...(department ? { department } : {}),
    }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env.JWT_ACCESS_TTL_SECONDS });
  }

  private async audit(userId: string | null, action: string, requestId: string) {
    try {
      await this.database.auditLog.create({
        data: { actorId: userId, action, entityType: "User", entityId: userId, requestId },
      });
    } catch {
      // Background audit logging failure should not break primary auth flow
    }
  }

  private async setSessionCookies(user: UserWithPatient, remember: boolean, response: import("express").Response) {
    const rawRefresh = randomBytes(48).toString("base64url");
    const maxAge = remember ? REFRESH_TTL : ONE_DAY;
    const sessionPromise = this.database.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawRefresh),
        rememberMe: remember,
        expiresAt: new Date(Date.now() + maxAge * 1000),
      },
    });
    const access = await this.issueAccessToken(user);
    await sessionPromise;
    response.setHeader("Set-Cookie", [
      cookie(ACCESS_COOKIE, access, env.JWT_ACCESS_TTL_SECONDS),
      cookie(REFRESH_COOKIE, rawRefresh, maxAge),
    ]);
  }

  async login(
    identifier: string,
    password: string,
    remember: boolean,
    requestId: string,
    response: import("express").Response,
    expectedRoles?: string[],
  ) {
    const trimmed = identifier.trim();
    const normalized = trimmed.toLowerCase();

    const lockout = failedLoginTracker.get(normalized);
    const now = Date.now();
    if (lockout && lockout.lockedUntil && lockout.lockedUntil > now) {
      const remainingMinutes = Math.ceil((lockout.lockedUntil - now) / 60000);
      void this.audit(null, "AUTH_LOGIN_LOCKED", requestId);
      throw new HttpError(
        429,
        `Account temporarily locked due to excessive failed attempts. Please try again in ${remainingMinutes} minute(s).`,
        "ACCOUNT_LOCKED"
      );
    }

    const user = await this.database.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { username: trimmed },
          { phone: trimmed },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        passwordHash: true,
        role: true,
        status: true,
        firstName: true,
        middleName: true,
        lastName: true,
        department: true,
        patient: { select: { id: true, department: true, phone: true } },
        doctor: { select: { id: true, department: true } },
      },
    }) as UserWithPatient | null;

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      const entry = failedLoginTracker.get(normalized) ?? { count: 0, lockedUntil: null };
      entry.count += 1;
      if (entry.count >= MAX_CONSECUTIVE_FAILED_LOGINS) {
        entry.lockedUntil = now + LOCKOUT_DURATION_MS;
        void this.audit(user?.id ?? null, "AUTH_LOGIN_LOCKED", requestId);
      }
      failedLoginTracker.set(normalized, entry);
      void this.audit(null, "AUTH_LOGIN_FAILED", requestId);
      throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    // Credentials valid: clear any prior lockout counter
    failedLoginTracker.delete(normalized);
    if (user.username) failedLoginTracker.delete(user.username.toLowerCase());
    if (user.email) failedLoginTracker.delete(user.email.toLowerCase());
    if (user.phone) failedLoginTracker.delete(user.phone);

    if (user.status !== "ACTIVE") {
      void this.audit(user.id, "AUTH_LOGIN_BLOCKED", requestId);
      if (user.status === "DISABLED") {
        throw new HttpError(403, "This account has been disabled. Contact the hospital administrator.", "ACCOUNT_DISABLED");
      }
      if (user.role === "PATIENT") {
        throw new HttpError(403, "This account is not active. Contact the hospital registration desk.", "ACCOUNT_NOT_ACTIVE");
      }
      throw new HttpError(403, "This staff account is pending administrator approval. Contact the hospital administrator.", "ACCOUNT_PENDING_APPROVAL");
    }

    // When a portal is selected, enforce that the account's real role belongs
    // to that portal. This prevents a valid account from being used to sign
    // into a portal it is not authorized for, even if the client is bypassed.
    if (expectedRoles && expectedRoles.length > 0) {
      const allowedRoles = new Set(expectedRoles.map((role) => role.trim().toUpperCase()));
      if (!allowedRoles.has(user.role)) {
        void this.audit(user.id, "AUTH_LOGIN_ROLE_MISMATCH", requestId);
        throw new HttpError(
          403,
          "This account is not authorized for the selected portal. Please sign in using the portal that matches your role.",
          "ROLE_MISMATCH",
        );
      }
    }

    await this.setSessionCookies(user, remember, response);
    void this.audit(user.id, "AUTH_LOGIN_SUCCEEDED", requestId);
    return presentUser(user);
  }

  async register(input: {
    firstName: string;
    middleName: string;
    lastName: string;
    gender: "male" | "female" | "other";
    dateOfBirth: string;
    phone: string;
    email: string;
    address: string;
    password: string;
  }, requestId: string) {
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();

    const existingEmail = await this.database.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new HttpError(409, "An account with this email address already exists", "EMAIL_ALREADY_EXISTS");
    }

    const existingPhone = await this.database.user.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (existingPhone) {
      throw new HttpError(409, "An account with this phone number already exists", "PHONE_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const parsedDob = input.dateOfBirth.includes("T")
      ? new Date(input.dateOfBirth)
      : new Date(`${input.dateOfBirth}T00:00:00.000Z`);

    const initialStatus: AccountStatus = env.PATIENT_REGISTRATION_REQUIRES_VERIFICATION ? "PENDING" : "ACTIVE";

    const user = await this.database.user.create({
      data: {
        email,
        phone,
        passwordHash,
        role: "PATIENT",
        status: initialStatus,
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || null,
        lastName: input.lastName.trim(),
        patient: {
          create: {
            patientNumber: `GHMS-${randomBytes(6).toString("hex").toUpperCase()}`,
            firstName: input.firstName.trim(),
            middleName: input.middleName?.trim() || null,
            lastName: input.lastName.trim(),
            sex: input.gender,
            dateOfBirth: parsedDob,
            phone,
            email,
            address: input.address.trim(),
            department: "Registration",
          },
        },
      },
      include: { patient: true, doctor: true },
    }) as UserWithPatient;
    await this.audit(user.id, "AUTH_PATIENT_REGISTERED", requestId);
    return presentUser(user);
  }

  async refresh(rawToken: string | undefined, response: import("express").Response) {
    if (!rawToken) throw new HttpError(401, "Authentication is required", "UNAUTHENTICATED");
    const tokenHash = hashToken(rawToken);
    const session = await this.database.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: { include: { patient: true, doctor: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
      throw new HttpError(401, "Refresh session is invalid or expired", "INVALID_REFRESH_TOKEN");
    }

    const rotated = randomBytes(48).toString("base64url");
    const refreshTtl = session.rememberMe ? REFRESH_TTL : ONE_DAY;
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);
    const updated = await this.database.refreshSession.updateMany({
      where: { id: session.id, tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { tokenHash: hashToken(rotated), expiresAt },
    });
    if (updated.count !== 1) throw new HttpError(401, "Refresh session is invalid or expired", "INVALID_REFRESH_TOKEN");

    const user = session.user as UserWithPatient;
    const access = await this.issueAccessToken(user);
    response.setHeader("Set-Cookie", [
      cookie(ACCESS_COOKIE, access, env.JWT_ACCESS_TTL_SECONDS),
      cookie(REFRESH_COOKIE, rotated, refreshTtl),
    ]);
    return { refreshed: true };
  }

  async logout(rawToken: string | undefined, response: import("express").Response) {
    if (rawToken) {
      await this.database.refreshSession.updateMany({
        where: { tokenHash: hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    response.setHeader("Set-Cookie", [
      clearCookie(ACCESS_COOKIE, "/"),
      clearCookie(REFRESH_COOKIE, "/"),
      clearCookie(ACCESS_COOKIE, "/api/v1"),
      clearCookie(REFRESH_COOKIE, "/api/v1"),
    ]);
    return { loggedOut: true };
  }

  async me(userId: string) {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        passwordHash: true,
        role: true,
        status: true,
        firstName: true,
        middleName: true,
        lastName: true,
        department: true,
        patient: { select: { id: true, department: true, phone: true } },
        doctor: { select: { id: true, department: true } },
      },
    }) as UserWithPatient | null;
    if (!user || user.status !== "ACTIVE") throw new HttpError(401, "Authentication is required", "UNAUTHENTICATED");
    return presentUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, requestId: string) {
    const user = await this.database.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new HttpError(400, "Current password is incorrect", "INVALID_CURRENT_PASSWORD");
    }
    await this.database.$transaction([
      this.database.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } }),
      this.database.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.database.auditLog.create({ data: { actorId: userId, action: "AUTH_PASSWORD_CHANGED", entityType: "User", entityId: userId, requestId } }),
    ]);
    return { changed: true };
  }

  async forgotPassword(identifier: string, requestId: string) {
    const trimmed = identifier.trim();
    const normalized = trimmed.toLowerCase();
    const user = await this.database.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { username: trimmed },
          { phone: trimmed },
        ],
      },
      select: { id: true, email: true, status: true },
    });

    let resetToken: string | undefined;

    if (user && user.status === "ACTIVE") {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

      // Invalidate existing unused tokens for this user
      await this.database.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await this.database.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await this.audit(user.id, "AUTH_PASSWORD_RESET_REQUESTED", requestId);
      resetToken = rawToken;
    } else {
      await this.audit(null, "AUTH_PASSWORD_RESET_UNKNOWN_IDENTIFIER", requestId);
    }

    // Uniform anti-enumeration response
    return {
      message: "If an account matches that identifier, password reset instructions have been dispatched.",
      ...(env.NODE_ENV !== "production" ? { resetToken } : {}),
    };
  }

  async resetPassword(rawToken: string, newPassword: string, requestId: string) {
    const tokenHash = hashToken(rawToken);
    const resetRecord = await this.database.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt <= new Date() || resetRecord.user.status !== "ACTIVE") {
      throw new HttpError(400, "Reset token is invalid or has expired", "INVALID_RESET_TOKEN");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await this.database.$transaction([
      this.database.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      this.database.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all active sessions across devices
      this.database.refreshSession.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.database.auditLog.create({
        data: {
          actorId: resetRecord.userId,
          action: "AUTH_PASSWORD_RESET_COMPLETED",
          entityType: "User",
          entityId: resetRecord.userId,
          requestId,
        },
      }),
    ]);

    // Clear any lockout trackers for this account
    failedLoginTracker.delete(resetRecord.user.email.toLowerCase());
    if (resetRecord.user.username) failedLoginTracker.delete(resetRecord.user.username.toLowerCase());
    if (resetRecord.user.phone) failedLoginTracker.delete(resetRecord.user.phone);

    return { reset: true, message: "Password has been reset successfully. Please log in with your new password." };
  }

  async listUsers(query: {
    role?: string;
    status?: "ACTIVE" | "PENDING" | "DISABLED";
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: import("@prisma/client").Prisma.UserWhereInput = {};
    if (query.role) {
      where.role = query.role as UserRole;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { email: { contains: term } },
        { firstName: { contains: term } },
        { lastName: { contains: term } },
        { phone: { contains: term } },
        { username: { contains: term } },
      ];
    }

    const [total, users] = await Promise.all([
      this.database.user.count({ where }),
      this.database.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          phone: true,
          role: true,
          status: true,
          firstName: true,
          middleName: true,
          lastName: true,
          department: true,
          createdAt: true,
          updatedAt: true,
          patient: { select: { id: true, patientNumber: true } },
          doctor: { select: { id: true, specialty: true } },
        },
      }),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        name: [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" "),
        firstName: u.firstName,
        middleName: u.middleName,
        lastName: u.lastName,
        email: u.email,
        username: u.username,
        phone: u.phone ?? "",
        role: u.role,
        roleLabel: roleLabel(u.role),
        status: u.status,
        department: u.department ?? "—",
        patientNumber: u.patient?.patientNumber ?? null,
        doctorSpecialty: u.doctor?.specialty ?? null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(
    targetUserId: string,
    newStatus: "ACTIVE" | "PENDING" | "DISABLED",
    adminActorId: string,
    requestId: string,
    reason?: string
  ) {
    if (targetUserId === adminActorId) {
      throw new HttpError(400, "Administrators cannot modify their own account status", "CANNOT_MODIFY_OWN_STATUS");
    }

    const targetUser = await this.database.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!targetUser) {
      throw new HttpError(404, "User not found", "USER_NOT_FOUND");
    }

    const previousStatus = targetUser.status;

    await this.database.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { status: newStatus },
      });

      // If account is being disabled or moved to pending, revoke all active sessions immediately
      if (newStatus !== "ACTIVE") {
        await tx.refreshSession.updateMany({
          where: { userId: targetUserId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: adminActorId,
          action: "AUTH_ACCOUNT_STATUS_CHANGED",
          entityType: "User",
          entityId: targetUserId,
          requestId,
        },
      });
    });

    return {
      userId: targetUserId,
      email: targetUser.email,
      role: targetUser.role,
      previousStatus,
      status: newStatus,
      reason: reason ?? null,
      message: `User account status updated to ${newStatus}.`,
    };
  }

  async createStaff(
    input: {
      email: string;
      phone?: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      department: string;
      role: UserRole;
      password: string;
    },
    adminActorId: string,
    requestId: string
  ) {
    const email = input.email.trim().toLowerCase();
    const phone = input.phone?.trim() || null;

    const existingEmail = await this.database.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new HttpError(409, "An account with this email address already exists", "EMAIL_ALREADY_EXISTS");
    }

    if (phone) {
      const existingPhone = await this.database.user.findFirst({
        where: { phone },
        select: { id: true },
      });
      if (existingPhone) {
        throw new HttpError(409, "An account with this phone number already exists", "PHONE_ALREADY_EXISTS");
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Requirement: Staff accounts must start as PENDING and require administrator activation
    const user = await this.database.user.create({
      data: {
        email,
        phone,
        passwordHash,
        role: input.role,
        status: "PENDING",
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || null,
        lastName: input.lastName.trim(),
        department: input.department.trim(),
        ...(input.role === "DOCTOR"
          ? {
              doctor: {
                create: {
                  name: `Dr. ${input.firstName.trim()} ${input.lastName.trim()}`,
                  specialty: input.department.trim(),
                  department: input.department.trim(),
                  active: false,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        middleName: true,
        lastName: true,
        department: true,
        createdAt: true,
      },
    });

    await this.audit(adminActorId, "AUTH_STAFF_CREATED_PENDING", requestId);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      department: user.department,
      message: "Staff account created with PENDING status. An administrator must activate this account before use.",
    };
  }
}

export const authCookies = { refreshName: REFRESH_COOKIE, getCookie };
export const authLockoutTracker = failedLoginTracker;
