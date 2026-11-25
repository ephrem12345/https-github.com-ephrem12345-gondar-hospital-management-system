import { randomBytes } from "node:crypto";
import {
  EmergencyCaseStatus,
  Prisma,
  type Patient,
  type PrismaClient,
} from "@prisma/client";
import { z } from "zod";
import { HttpError } from "../../utils/http-error.js";
import {
  departmentAssignmentSchema,
  departmentListQuerySchema,
  departmentWorkflowSchema,
  emergencyConsultationSchema,
  emergencyListQuerySchema,
  emergencyRegistrationSchema,
  emergencyTriageSchema,
  emergencyWorkflowSchema,
} from "./schemas.js";

type Actor = NonNullable<Express.Request["actor"]>;

const transitions: Record<EmergencyCaseStatus, readonly EmergencyCaseStatus[]> = {
  ARRIVAL: ["TRIAGE"],
  TRIAGE: ["WAITING"],
  WAITING: ["ASSESSMENT"],
  ASSESSMENT: ["TREATMENT"],
  TREATMENT: ["OBSERVATION", "ADMISSION", "REFERRAL", "TRANSFER", "DISCHARGE"],
  OBSERVATION: ["TREATMENT", "ADMISSION", "TRANSFER", "DISCHARGE"],
  ADMISSION: ["TRANSFER", "DISCHARGE"],
  REFERRAL: ["TRANSFER", "DISCHARGE"],
  TRANSFER: ["TREATMENT", "DISCHARGE"],
  DISCHARGE: [],
};

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, result.error.issues.map((issue) => issue.message).join("; ") || "Invalid request", "VALIDATION_ERROR");
  }
  return result.data;
}

function assertEmergencyAccess(actor: Actor) {
  if (actor.role === "ADMINISTRATOR" || actor.role === "RECEPTIONIST") return;
  if (!["DOCTOR", "NURSE", "DEPARTMENT_HEAD"].includes(actor.role) || actor.department?.toLowerCase() !== "emergency") {
    throw new HttpError(403, "You are not assigned to the emergency department", "FORBIDDEN");
  }
}

function publicCase(row: any) {
  const patient = row.patient;
  const temporary = row.temporaryPatient;
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    patientId: patient?.patientNumber ?? null,
    patientIdentifier: patient?.patientNumber ?? row.patientIdentifier ?? temporary?.temporaryNumber ?? "UNIDENTIFIED",
    patientName: patient ? [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" ") : temporary?.fullName ?? "Unidentified patient",
    arrivalTime: row.arrivalAt,
    arrivalMode: row.arrivalMode,
    presentingComplaint: row.presentingComplaint,
    triageCategory: row.triages[0]?.category ?? "Untriaged",
    priority: row.triages[0]?.priority ?? null,
    assignedDoctor: row.assignedStaffName ?? row.triages[0]?.assignedStaff ?? "Unassigned",
    currentStatus: row.status,
    destination: row.events.at(-1)?.destination ?? undefined,
  };
}

export class EmergencyService {
  constructor(private readonly db: PrismaClient) {}

  async listCases(input: unknown, actor: Actor) {
    assertEmergencyAccess(actor);
    const query = parse(emergencyListQuerySchema, input);
    const where: Prisma.EmergencyCaseWhereInput = {};
    if (query.status) {
      if (!Object.values(EmergencyCaseStatus).includes(query.status as EmergencyCaseStatus)) {
        throw new HttpError(400, "Invalid emergency case status", "VALIDATION_ERROR");
      }
      where.status = query.status as EmergencyCaseStatus;
    }
    if (query.from || query.to) where.arrivalAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
    if (query.search) {
      where.OR = [
        { caseNumber: { contains: query.search } },
        { patientIdentifier: { contains: query.search } },
        { patient: { patientNumber: { contains: query.search } } },
        { patient: { firstName: { contains: query.search } } },
        { patient: { lastName: { contains: query.search } } },
        { temporaryPatient: { temporaryNumber: { contains: query.search } } },
      ];
    }
    const [rows, total] = await this.db.$transaction([
      this.db.emergencyCase.findMany({
        where,
        include: { patient: true, temporaryPatient: true, triages: { orderBy: { recordedAt: "desc" }, take: 1 }, events: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { arrivalAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.emergencyCase.count({ where }),
    ]);
    return { data: rows.map(publicCase), total, page: query.page, pageSize: query.pageSize };
  }

  async register(input: unknown, actor: Actor) {
    assertEmergencyAccess(actor);
    const data = parse(emergencyRegistrationSchema, input);
    let patient: Patient | null = null;
    if (data.patientIdentifier) {
      patient = await this.db.patient.findUnique({ where: { patientNumber: data.patientIdentifier } });
      if (!patient) throw new HttpError(404, "Patient not found; register a new patient or provide an unidentified-patient record", "PATIENT_NOT_FOUND");
    }

    const caseNumber = `ER-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const result = await this.db.$transaction(async (tx) => {
      let temporaryPatientId: string | undefined;
      if (data.unidentified) {
        const temporary = await tx.temporaryEmergencyPatient.create({
          data: {
            temporaryNumber: `TEMP-${randomBytes(5).toString("hex").toUpperCase()}`,
            ...(data.temporaryPatient ?? {}),
          },
        });
        temporaryPatientId = temporary.id;
      } else if (data.newPatient) {
        const details = data.newPatient;
        const newPatient = await tx.patient.create({
          data: {
            patientNumber: `GHMS-${randomBytes(5).toString("hex").toUpperCase()}`,
            firstName: details.firstName,
            middleName: details.middleName,
            lastName: details.lastName,
            sex: details.sex,
            dateOfBirth: details.dateOfBirth,
            phone: details.phone,
            department: details.department,
          },
        });
        patient = newPatient;
      }
      const created = await tx.emergencyCase.create({
        data: {
          caseNumber,
          patientId: patient?.id,
          temporaryPatientId,
          patientIdentifier: patient?.patientNumber ?? data.patientIdentifier,
          createdById: actor.userId,
          ...(data.arrivalAt ? { arrivalAt: data.arrivalAt } : {}),
          arrivalMode: data.arrivalMode,
          presentingComplaint: data.presentingComplaint,
        },
        include: { patient: true, temporaryPatient: true, triages: true, events: true },
      });
      await tx.auditLog.create({
        data: { actorId: actor.userId, action: "EMERGENCY_CASE_REGISTERED", entityType: "EmergencyCase", entityId: created.id },
      });
      return created;
    });
    return publicCase(result);
  }

  async triage(caseNumber: string, input: unknown, actor: Actor) {
    assertEmergencyAccess(actor);
    const data = parse(emergencyTriageSchema, input);
    const row = await this.db.emergencyCase.findUnique({ where: { caseNumber } });
    if (!row) throw new HttpError(404, "Emergency case not found", "NOT_FOUND");
    const previousTriage = await this.db.emergencyTriage.findFirst({ where: { emergencyCaseId: row.id } });
    if ((!data.reassessment && row.status !== "ARRIVAL") || (data.reassessment && (!previousTriage || row.status === "DISCHARGE"))) {
      throw new HttpError(409, "Triage is not valid for the current emergency case state", "INVALID_STATE");
    }
    const vitalSigns = typeof data.vitalSigns === "string" ? data.vitalSigns : data.vitalSigns as Prisma.InputJsonObject;
    const updated = await this.db.$transaction(async (tx) => {
      await tx.emergencyTriage.create({
        data: {
          emergencyCaseId: row.id,
          recordedById: actor.userId,
          category: data.category,
          priority: data.priority,
          assignedStaff: data.assignedStaff,
          assessmentNotes: data.assessmentNotes,
          vitalSigns,
          protocolName: data.protocolName,
          protocolVersion: data.protocolVersion,
          reassessment: data.reassessment,
        },
      });
      if (!data.reassessment) {
        await tx.emergencyWorkflowEvent.create({
          data: { emergencyCaseId: row.id, actorId: actor.userId, fromStatus: row.status, toStatus: "TRIAGE" },
        });
        await tx.emergencyWorkflowEvent.create({
          data: { emergencyCaseId: row.id, actorId: actor.userId, fromStatus: "TRIAGE", toStatus: "WAITING" },
        });
      }
      const changed = await tx.emergencyCase.update({
        where: { id: row.id },
        data: { ...(!data.reassessment ? { status: "WAITING" as const } : {}), assignedStaffName: data.assignedStaff },
        include: { patient: true, temporaryPatient: true, triages: { orderBy: { recordedAt: "desc" }, take: 1 }, events: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      await tx.auditLog.create({
        data: { actorId: actor.userId, action: data.reassessment ? "EMERGENCY_TRIAGE_REASSESSED" : "EMERGENCY_TRIAGE_RECORDED", entityType: "EmergencyCase", entityId: row.id },
      });
      return changed;
    });
    return publicCase(updated);
  }

  async transition(caseNumber: string, input: unknown, actor: Actor) {
    assertEmergencyAccess(actor);
    const data = parse(emergencyWorkflowSchema, input);
    const row = await this.db.emergencyCase.findUnique({ where: { caseNumber } });
    if (!row) throw new HttpError(404, "Emergency case not found", "NOT_FOUND");
    if (!transitions[row.status].includes(data.status)) {
      throw new HttpError(409, `Cannot transition emergency case from ${row.status} to ${data.status}`, "INVALID_STATE_TRANSITION");
    }
    const updated = await this.db.$transaction(async (tx) => {
      await tx.emergencyWorkflowEvent.create({
        data: {
          emergencyCaseId: row.id,
          actorId: actor.userId,
          fromStatus: row.status,
          toStatus: data.status,
          destination: data.destination,
          instructions: data.instructions,
        },
      });
      const changed = await tx.emergencyCase.update({
        where: { id: row.id },
        data: { status: data.status },
        include: { patient: true, temporaryPatient: true, triages: { orderBy: { recordedAt: "desc" }, take: 1 }, events: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      await tx.auditLog.create({
        data: { actorId: actor.userId, action: "EMERGENCY_WORKFLOW_TRANSITION", entityType: "EmergencyCase", entityId: row.id },
      });
      return changed;
    });
    return publicCase(updated);
  }

  async recordConsultation(caseNumber: string, input: unknown, actor: Actor) {
    assertEmergencyAccess(actor);
    const data = parse(emergencyConsultationSchema, input);
    const emergencyCase = await this.db.emergencyCase.findUnique({ where: { caseNumber }, select: { id: true } });
    if (!emergencyCase) throw new HttpError(404, "Emergency case not found", "NOT_FOUND");
    const consultation = await this.db.emergencyConsultation.create({
      data: { ...data, emergencyCaseId: emergencyCase.id, authorId: actor.userId },
    });
    await this.db.auditLog.create({
      data: { actorId: actor.userId, action: "EMERGENCY_CONSULTATION_RECORDED", entityType: "EmergencyConsultation", entityId: consultation.id },
    });
    return consultation;
  }

  async history(caseNumber: string, actor: Actor) {
    assertEmergencyAccess(actor);
    const row = await this.db.emergencyCase.findUnique({
      where: { caseNumber },
      include: {
        patient: { select: { patientNumber: true, firstName: true, lastName: true } },
        temporaryPatient: true,
        triages: { orderBy: { recordedAt: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
        consultations: { orderBy: { recordedAt: "asc" } },
      },
    });
    if (!row) throw new HttpError(404, "Emergency case not found", "NOT_FOUND");
    await this.db.auditLog.create({
      data: { actorId: actor.userId, action: "EMERGENCY_CASE_HISTORY_ACCESSED", entityType: "EmergencyCase", entityId: row.id },
    });
    return {
      ...publicCase(row),
      triageHistory: row.triages,
      workflowHistory: row.events,
      consultations: row.consultations,
      registeredAt: row.createdAt,
    };
  }

  async assignResource(caseNumber: string, resourceType: "BED" | "AMBULANCE", resourceId: string, actor: Actor) {
    assertEmergencyAccess(actor);
    const emergencyCase = await this.db.emergencyCase.findUnique({ where: { caseNumber }, select: { id: true } });
    if (!emergencyCase) throw new HttpError(404, "Emergency case not found", "NOT_FOUND");
    return this.db.emergencyResourceAssignment.create({
      data: { emergencyCaseId: emergencyCase.id, resourceType, resourceId, assignedById: actor.userId },
    });
  }

  async releaseResource(assignmentId: string, actor: Actor) {
    assertEmergencyAccess(actor);
    const resource = await this.db.emergencyResourceAssignment.findUnique({ where: { id: assignmentId } });
    if (!resource) throw new HttpError(404, "Emergency resource assignment not found", "NOT_FOUND");
    if (resource.releasedAt) throw new HttpError(409, "Emergency resource assignment has already been released", "INVALID_STATE");
    return this.db.emergencyResourceAssignment.update({ where: { id: assignmentId }, data: { releasedAt: new Date() } });
  }

  async report(from?: Date, to?: Date) {
    const where: Prisma.EmergencyCaseWhereInput = {
      ...(from || to ? { arrivalAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };
    const [total, byStatus, activeCases] = await this.db.$transaction([
      this.db.emergencyCase.count({ where }),
      this.db.emergencyCase.groupBy({ by: ["status"], where, orderBy: { status: "asc" }, _count: { _all: true } }),
      this.db.emergencyCase.findMany({ where, select: { id: true, triages: { select: { category: true } } } }),
    ]);
    const triageCategories = activeCases.reduce<Record<string, number>>((summary, row) => {
      const category = row.triages[0]?.category ?? "Untriaged";
      summary[category] = (summary[category] ?? 0) + 1;
      return summary;
    }, {});
    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((row) => [row.status, typeof row._count === "object" ? row._count._all ?? 0 : row._count])),
      triageCategories,
    };
  }

  async assignDepartment(input: unknown, actor: Actor) {
    const data = parse(departmentAssignmentSchema, input);
    this.assertDepartment(data.department, actor);
    const patient = await this.db.patient.findUnique({ where: { patientNumber: data.patientId }, select: { id: true } });
    if (!patient) throw new HttpError(404, "Patient not found", "NOT_FOUND");
    const assignment = await this.db.departmentAssignment.create({
      data: { ...data, patientId: patient.id, assignedById: actor.userId },
      include: { patient: { select: { patientNumber: true, firstName: true, lastName: true } } },
    });
    return assignment;
  }

  async listDepartmentAssignments(department: string | undefined, actor: Actor) {
    if (department) this.assertDepartment(department, actor);
    else if (actor.role !== "ADMINISTRATOR" && actor.role !== "RECEPTIONIST" && !actor.department) {
      throw new HttpError(403, "Your account has no assigned department", "FORBIDDEN");
    }
    const where = department ? { department } : actor.role === "ADMINISTRATOR" || actor.role === "RECEPTIONIST" ? {} : { department: actor.department! };
    const rows = await this.db.departmentAssignment.findMany({
      where,
      include: { patient: { select: { patientNumber: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((row) => ({ ...row, patientId: row.patient.patientNumber, patientName: `${row.patient.firstName} ${row.patient.lastName}` }));
  }

  async saveDepartmentWorkflow(input: unknown, actor: Actor) {
    const data = parse(departmentWorkflowSchema, input);
    this.assertDepartment(data.department, actor);
    const patient = await this.db.patient.findUnique({ where: { patientNumber: data.patientId }, select: { id: true } });
    if (!patient) throw new HttpError(404, "Patient not found", "NOT_FOUND");
    if (data.encounterId) {
      const encounter = await this.db.clinicalEncounter.findUnique({ where: { id: data.encounterId } });
      if (!encounter || encounter.patientId !== patient.id || encounter.department !== data.department) {
        throw new HttpError(400, "The encounter must belong to this patient and department", "INVALID_ENCOUNTER");
      }
    }
    const workflow = await this.db.departmentWorkflowRecord.create({
      data: { ...data, details: data.details as Prisma.InputJsonObject, patientId: patient.id, recordedById: actor.userId },
      include: { patient: { select: { patientNumber: true } } },
    });
    return { ...workflow, patientId: workflow.patient.patientNumber };
  }

  async listDepartmentWorkflows(input: unknown, actor: Actor) {
    const query = parse(departmentListQuerySchema, input);
    if (query.department) this.assertDepartment(query.department, actor);
    const department = query.department ?? (actor.role === "ADMINISTRATOR" || actor.role === "RECEPTIONIST" ? undefined : actor.department);
    if (!department && actor.role !== "ADMINISTRATOR" && actor.role !== "RECEPTIONIST") {
      throw new HttpError(403, "Your account has no assigned department", "FORBIDDEN");
    }
    const where: Prisma.DepartmentWorkflowRecordWhereInput = {
      ...(department ? { department } : {}),
      ...(query.search ? { OR: [{ summary: { contains: query.search } }, { kind: { contains: query.search } }] } : {}),
    };
    const [rows, total] = await this.db.$transaction([
      this.db.departmentWorkflowRecord.findMany({
        where, include: { patient: { select: { patientNumber: true } } },
        orderBy: { recordedAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      }),
      this.db.departmentWorkflowRecord.count({ where }),
    ]);
    return { data: rows.map((row) => ({ ...row, patientId: row.patient.patientNumber })), total, page: query.page, pageSize: query.pageSize };
  }

  async departmentReport(department: string, actor: Actor) {
    this.assertDepartment(department, actor);
    const [assignments, workflows] = await this.db.$transaction([
      this.db.departmentAssignment.count({ where: { department, status: "ACTIVE" } }),
      this.db.departmentWorkflowRecord.groupBy({ by: ["status"], where: { department }, orderBy: { status: "asc" }, _count: { _all: true } }),
    ]);
    return {
      department,
      activeAssignments: assignments,
      workflowsByStatus: Object.fromEntries(workflows.map((row) => [row.status, typeof row._count === "object" ? row._count._all ?? 0 : row._count])),
    };
  }

  private assertDepartment(department: string, actor: Actor) {
    if (
      actor.role !== "ADMINISTRATOR" &&
      actor.role !== "SUPER_ADMIN" &&
      actor.role !== "RECEPTIONIST" &&
      actor.department?.toLowerCase() !== department.toLowerCase()
    ) {
      throw new HttpError(403, "You are not authorized for this department", "FORBIDDEN");
    }
  }
}
