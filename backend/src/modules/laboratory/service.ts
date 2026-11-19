import { randomBytes } from "node:crypto";
import type { PrismaClient, UserRole, LaboratoryOrderStatus } from "@prisma/client";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateLaboratoryOrderInput,
  ListLaboratoryOrdersQueryInput,
  SubmitLaboratoryResultsInput,
  UpdateLaboratoryOrderStatusInput,
} from "./schemas.js";

type AuthActor = {
  userId: string;
  role: UserRole;
  department?: string;
  patientId?: string;
};

export class LaboratoryService {
  constructor(private readonly database: PrismaClient) {}

  private async audit(actorId: string, action: string, entityId: string, requestId: string) {
    try {
      await this.database.auditLog.create({
        data: {
          actorId,
          action,
          entityType: "LaboratoryOrder",
          entityId,
          requestId,
        },
      });
    } catch {
      // Background audit logging failure should not break primary flow
    }
  }

  async getCatalog() {
    let items = await this.database.laboratoryTestCatalogItem.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Seed default hospital lab tests if catalog is empty
    if (items.length === 0) {
      const defaultCatalog = [
        { code: "LAB-CBC", name: "Complete Blood Count (CBC)", category: "Hematology", specimenType: "Whole Blood (EDTA)", unit: "10^3/uL", referenceInterval: "4.5 - 11.0", servicePrice: 180 },
        { code: "LAB-GLU-R", name: "Random Blood Glucose", category: "Biochemistry", specimenType: "Serum", unit: "mg/dL", referenceInterval: "70 - 140", servicePrice: 90 },
        { code: "LAB-GLU-F", name: "Fasting Blood Glucose", category: "Biochemistry", specimenType: "Serum", unit: "mg/dL", referenceInterval: "70 - 100", servicePrice: 100 },
        { code: "LAB-LIPID", name: "Lipid Profile (Cholesterol, TG, HDL, LDL)", category: "Biochemistry", specimenType: "Serum", unit: "mg/dL", referenceInterval: "Desirable < 200", servicePrice: 320 },
        { code: "LAB-RFT", name: "Renal Function Test (Creatinine & Urea)", category: "Biochemistry", specimenType: "Serum", unit: "mg/dL", referenceInterval: "Creatinine 0.7 - 1.3", servicePrice: 250 },
        { code: "LAB-LFT", name: "Liver Function Test (ALT, AST, Bilirubin)", category: "Biochemistry", specimenType: "Serum", unit: "U/L", referenceInterval: "ALT 7 - 56, AST 10 - 40", servicePrice: 300 },
        { code: "LAB-URINE", name: "Routine Urinalysis", category: "Clinical Microscopy", specimenType: "Clean Catch Urine", unit: "visual/micro", referenceInterval: "Negative", servicePrice: 80 },
        { code: "LAB-MALARIA", name: "Malaria Blood Film / Rapid Test", category: "Parasitology", specimenType: "Capillary / Whole Blood", unit: "parasites/uL", referenceInterval: "Negative / No parasites", servicePrice: 120 },
        { code: "LAB-TYPHOID", name: "Widal Test (Typhoid Serology)", category: "Serology", specimenType: "Serum", unit: "titer", referenceInterval: "< 1:80", servicePrice: 150 },
        { code: "LAB-ELECT", name: "Serum Electrolytes (Na+, K+, Cl-)", category: "Biochemistry", specimenType: "Serum", unit: "mmol/L", referenceInterval: "Na 135-145, K 3.5-5.0", servicePrice: 240 },
        { code: "LAB-ESR", name: "Erythrocyte Sedimentation Rate (ESR)", category: "Hematology", specimenType: "Whole Blood", unit: "mm/hr", referenceInterval: "0 - 20", servicePrice: 95 },
      ];

      for (const item of defaultCatalog) {
        await this.database.laboratoryTestCatalogItem.upsert({
          where: { code: item.code },
          update: {},
          create: item,
        });
      }

      items = await this.database.laboratoryTestCatalogItem.findMany({
        where: { active: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
    }

    return items;
  }

  async createOrder(actor: AuthActor, input: CreateLaboratoryOrderInput, requestId: string) {
    const patient = await this.database.patient.findUnique({
      where: { id: input.patientId },
      select: { id: true, firstName: true, middleName: true, lastName: true, patientNumber: true, department: true },
    });
    if (!patient) throw new HttpError(404, "Patient not found", "PATIENT_NOT_FOUND");
    const patientFullName = [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" ");

    const tests = await this.database.laboratoryTestCatalogItem.findMany({
      where: { id: { in: input.testCatalogIds }, active: true },
    });
    if (tests.length === 0) throw new HttpError(400, "At least one valid laboratory test must be selected", "INVALID_TESTS");

    const orderNumber = `LAB-${Date.now().toString().slice(-6)}-${randomBytes(2).toString("hex").toUpperCase()}`;

    const order = await this.database.$transaction(async (tx) => {
      const created = await tx.laboratoryOrder.create({
        data: {
          orderNumber,
          patientId: input.patientId,
          requestedById: actor.userId,
          department: input.department || patient.department || "Internal Medicine",
          priority: input.priority,
          status: "PENDING",
          clinicalIndication: input.clinicalIndication,
          items: {
            create: tests.map((t) => ({ catalogId: t.id })),
          },
        },
        include: {
          items: { include: { catalog: true } },
          patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
          requestedBy: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
        },
      });

      // Dispatch linked ClinicalMessage from Doctor to Laboratory Staff
      const testNames = tests.map((t) => t.name).join(", ");
      const msgPriority = input.priority === "STAT" ? "STAT" : input.priority === "Urgent" ? "URGENT" : "ROUTINE";

      const clinicalMsg = await tx.clinicalMessage.create({
        data: {
          senderId: actor.userId,
          recipientRole: "LABORATORY_TECHNICIAN",
          patientId: input.patientId,
          department: "Laboratory",
          category: "LABORATORY_REQUEST",
          priority: msgPriority,
          subject: `Lab Request: ${orderNumber} - ${testNames}`,
          content: `Clinical Indication: ${input.clinicalIndication}\nRequested Tests: ${testNames}\nPatient: ${patientFullName} (${patient.patientNumber})\nPriority: ${input.priority}`,
          status: "SENT",
          laboratoryOrderId: created.id,
        },
      });

      // Notify laboratory technicians
      const labStaff = await tx.user.findMany({
        where: { role: "LABORATORY_TECHNICIAN", status: "ACTIVE" },
        select: { id: true },
      });

      if (labStaff.length > 0) {
        await tx.messageRecipient.createMany({
          data: labStaff.map((s) => ({
            messageId: clinicalMsg.id,
            userId: s.id,
            status: "DELIVERED",
            deliveredAt: new Date(),
          })),
        });

        await tx.clinicalNotification.createMany({
          data: labStaff.map((s) => ({
            userId: s.id,
            messageId: clinicalMsg.id,
            laboratoryOrderId: created.id,
            title: `[${input.priority}] New Lab Request ${orderNumber}`,
            body: `${testNames} for Patient ${patientFullName} (${patient.patientNumber})`,
            category: "LAB_REQUEST",
            priority: msgPriority,
            read: false,
          })),
        });
      }

      return created;
    });

    await this.audit(actor.userId, "LABORATORY_ORDER_CREATED", order.id, requestId);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      patientId: order.patientId,
      patientName: patientFullName,
      patientNumber: patient.patientNumber,
      requestedByName: `Dr. ${order.requestedBy.firstName} ${order.requestedBy.lastName}`,
      department: order.department,
      priority: order.priority,
      status: order.status,
      clinicalIndication: order.clinicalIndication,
      requestedAt: order.requestedAt,
      items: order.items.map((i) => ({
        id: i.id,
        catalogId: i.catalogId,
        testName: i.catalog.name,
        category: i.catalog.category,
        specimenType: i.catalog.specimenType,
        unit: i.catalog.unit,
        referenceInterval: i.catalog.referenceInterval,
      })),
    };
  }

  async listOrders(actor: AuthActor, query: ListLaboratoryOrdersQueryInput) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: import("@prisma/client").Prisma.LaboratoryOrderWhereInput = {
      ...(query.status ? { status: query.status as LaboratoryOrderStatus } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.search ? {
        OR: [
          { orderNumber: { contains: query.search } },
          { clinicalIndication: { contains: query.search } },
          { patient: { firstName: { contains: query.search } } },
          { patient: { lastName: { contains: query.search } } },
          { patient: { patientNumber: { contains: query.search } } },
        ],
      } : {}),
    };

    const [total, orders] = await Promise.all([
      this.database.laboratoryOrder.count({ where }),
      this.database.laboratoryOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: "desc" },
        include: {
          patient: { select: { id: true, patientNumber: true, firstName: true, middleName: true, lastName: true, sex: true, dateOfBirth: true } },
          requestedBy: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          items: {
            include: {
              catalog: true,
              result: true,
            },
          },
        },
      }),
    ]);

    return {
      items: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        patientId: o.patientId,
        patientName: [o.patient.firstName, o.patient.middleName, o.patient.lastName].filter(Boolean).join(" "),
        patientNumber: o.patient.patientNumber,
        patientGender: o.patient.sex,
        requestedById: o.requestedById,
        requestedByName: `Dr. ${o.requestedBy.firstName} ${o.requestedBy.lastName}`,
        requestedByDepartment: o.requestedBy.department,
        assignedToName: o.assignedTo ? `${o.assignedTo.firstName} ${o.assignedTo.lastName}` : null,
        department: o.department,
        priority: o.priority,
        status: o.status,
        clinicalIndication: o.clinicalIndication,
        requestedAt: o.requestedAt,
        itemsCount: o.items.length,
        items: o.items.map((i) => ({
          id: i.id,
          catalogId: i.catalogId,
          testName: i.catalog.name,
          category: i.catalog.category,
          specimenType: i.catalog.specimenType,
          unit: i.catalog.unit,
          referenceInterval: i.catalog.referenceInterval,
          resultValue: i.result?.value ?? null,
          abnormalFlag: i.result?.abnormalFlag ?? null,
          resultStatus: i.result?.status ?? null,
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderById(orderId: string) {
    const order = await this.database.laboratoryOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: { select: { id: true, patientNumber: true, firstName: true, middleName: true, lastName: true, sex: true, dateOfBirth: true, department: true, bloodGroup: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, role: true, department: true, email: true, phone: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
        items: {
          include: {
            catalog: true,
            result: {
              include: {
                author: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        clinicalMessages: {
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, role: true } },
            replies: {
              include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
            },
          },
        },
      },
    });

    if (!order) throw new HttpError(404, "Laboratory order not found", "NOT_FOUND");

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      patient: {
        id: order.patient.id,
        patientNumber: order.patient.patientNumber,
        name: [order.patient.firstName, order.patient.middleName, order.patient.lastName].filter(Boolean).join(" "),
        sex: order.patient.sex,
        dateOfBirth: order.patient.dateOfBirth,
        bloodGroup: order.patient.bloodGroup,
        department: order.patient.department,
      },
      requestedBy: {
        id: order.requestedBy.id,
        name: `Dr. ${order.requestedBy.firstName} ${order.requestedBy.lastName}`,
        department: order.requestedBy.department,
        role: order.requestedBy.role,
        email: order.requestedBy.email,
        phone: order.requestedBy.phone,
      },
      assignedTo: order.assignedTo ? {
        id: order.assignedTo.id,
        name: `${order.assignedTo.firstName} ${order.assignedTo.lastName}`,
      } : null,
      department: order.department,
      priority: order.priority,
      status: order.status,
      clinicalIndication: order.clinicalIndication,
      requestedAt: order.requestedAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      items: order.items.map((i) => ({
        id: i.id,
        catalogId: i.catalogId,
        testCode: i.catalog.code,
        testName: i.catalog.name,
        category: i.catalog.category,
        specimenType: i.catalog.specimenType,
        unit: i.catalog.unit,
        referenceInterval: i.catalog.referenceInterval,
        instructions: i.catalog.instructions,
        result: i.result ? {
          id: i.result.id,
          value: i.result.value,
          unit: i.result.unit,
          referenceRange: i.result.referenceRange,
          abnormalFlag: i.result.abnormalFlag,
          comments: i.result.comments,
          status: i.result.status,
          recordedAt: i.result.recordedAt,
          releasedAt: i.result.releasedAt,
          verifiedByName: `${i.result.author.firstName} ${i.result.author.lastName}`,
        } : null,
      })),
      messages: order.clinicalMessages.map((m) => ({
        id: m.id,
        senderName: `${m.sender.firstName} ${m.sender.lastName}`,
        senderRole: m.sender.role,
        subject: m.subject,
        content: m.content,
        priority: m.priority,
        createdAt: m.createdAt,
        replies: m.replies.map((r) => ({
          id: r.id,
          senderName: `${r.sender.firstName} ${r.sender.lastName}`,
          senderRole: r.sender.role,
          content: r.content,
          createdAt: r.createdAt,
        })),
      })),
    };
  }

  async updateStatus(orderId: string, actor: AuthActor, input: UpdateLaboratoryOrderStatusInput, requestId: string) {
    const existing = await this.database.laboratoryOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: { select: { firstName: true, lastName: true, patientNumber: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!existing) throw new HttpError(404, "Laboratory order not found", "NOT_FOUND");

    const assignedToId = input.assignedToId || (actor.role === "LABORATORY_TECHNICIAN" ? actor.userId : existing.assignedToId);

    const updated = await this.database.$transaction(async (tx) => {
      const order = await tx.laboratoryOrder.update({
        where: { id: orderId },
        data: {
          status: input.status,
          assignedToId,
          ...(input.status === "CANCELLED"
            ? { cancelledAt: new Date(), cancellationReason: input.cancellationReason || "Cancelled by clinical staff" }
            : {}),
        },
      });

      // Notify the requesting doctor
      const statusLabels: Record<string, string> = {
        PENDING: "Requested",
        ASSIGNED: "Accepted by Lab",
        SPECIMEN_COLLECTED: "Sample Collected",
        PROCESSING: "In Processing",
        COMPLETED: "Completed",
        CANCELLED: "Cancelled",
      };

      await tx.clinicalNotification.create({
        data: {
          userId: existing.requestedById,
          laboratoryOrderId: order.id,
          title: `Lab Order ${existing.orderNumber} Status: ${statusLabels[input.status] || input.status}`,
          body: `Order for ${existing.patient.firstName} ${existing.patient.lastName} (${existing.patient.patientNumber}) is now ${statusLabels[input.status] || input.status}.`,
          category: "LAB_STATUS",
          priority: existing.priority === "STAT" ? "STAT" : existing.priority === "Urgent" ? "URGENT" : "ROUTINE",
        },
      });

      return order;
    });

    await this.audit(actor.userId, "LABORATORY_STATUS_UPDATED", orderId, requestId);

    return {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      assignedToId: updated.assignedToId,
      message: `Laboratory order status updated to ${updated.status}.`,
    };
  }

  async submitResults(orderId: string, actor: AuthActor, input: SubmitLaboratoryResultsInput, requestId: string) {
    const order = await this.database.laboratoryOrder.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { catalog: true } },
        patient: { select: { firstName: true, lastName: true, patientNumber: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!order) throw new HttpError(404, "Laboratory order not found", "NOT_FOUND");

    const orderItemIds = new Set(order.items.map((i) => i.id));
    for (const r of input.results) {
      if (!orderItemIds.has(r.orderItemId)) {
        throw new HttpError(400, `Order item ${r.orderItemId} does not belong to this laboratory order`, "INVALID_ORDER_ITEM");
      }
    }

    const patientFullName = `${order.patient.firstName} ${order.patient.lastName}`;

    await this.database.$transaction(async (tx) => {
      // Upsert results for each order item
      for (const res of input.results) {
        const item = order.items.find((i) => i.id === res.orderItemId)!;
        await tx.laboratoryResult.upsert({
          where: { orderItemId: res.orderItemId },
          update: {
            value: res.value,
            unit: item.catalog.unit || null,
            referenceRange: item.catalog.referenceInterval || null,
            abnormalFlag: res.abnormalFlag,
            comments: res.comments || null,
            status: "RELEASED",
            authorId: actor.userId,
            reviewerId: actor.userId,
            approvedAt: new Date(),
            releasedAt: new Date(),
          },
          create: {
            orderItemId: res.orderItemId,
            authorId: actor.userId,
            reviewerId: actor.userId,
            kind: "Quantitative",
            value: res.value,
            unit: item.catalog.unit || null,
            referenceRange: item.catalog.referenceInterval || null,
            abnormalFlag: res.abnormalFlag,
            comments: res.comments || null,
            status: "RELEASED",
            approvedAt: new Date(),
            releasedAt: new Date(),
          },
        });
      }

      // Mark order COMPLETED
      await tx.laboratoryOrder.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          assignedToId: actor.userId,
        },
      });

      // Check if any results are critical
      const hasCritical = input.results.some((r) => r.abnormalFlag === "CRITICAL");
      const priority = hasCritical ? "STAT" : order.priority === "STAT" ? "STAT" : order.priority === "Urgent" ? "URGENT" : "ROUTINE";

      // Dispatch Laboratory Alert message to Requesting Doctor
      const resultSummary = input.results
        .map((r) => {
          const item = order.items.find((i) => i.id === r.orderItemId)!;
          return `${item.catalog.name}: ${r.value} ${item.catalog.unit || ""} [${r.abnormalFlag}]`;
        })
        .join("\n");

      const alertMsg = await tx.clinicalMessage.create({
        data: {
          senderId: actor.userId,
          recipientId: order.requestedById,
          patientId: order.patientId,
          department: "Laboratory",
          category: "LABORATORY_ALERT",
          priority,
          subject: `${hasCritical ? "[CRITICAL ALERT] " : ""}Verified Lab Results: ${order.orderNumber} - ${patientFullName}`,
          content: `Verified laboratory results have been completed and released for Patient ${patientFullName} (${order.patient.patientNumber}):\n\n${resultSummary}${input.overallComments ? `\n\nLab Comments: ${input.overallComments}` : ""}`,
          status: "SENT",
          laboratoryOrderId: order.id,
        },
      });

      await tx.messageRecipient.create({
        data: {
          messageId: alertMsg.id,
          userId: order.requestedById,
          status: "DELIVERED",
          deliveredAt: new Date(),
        },
      });

      await tx.clinicalNotification.create({
        data: {
          userId: order.requestedById,
          messageId: alertMsg.id,
          laboratoryOrderId: order.id,
          title: `${hasCritical ? "CRITICAL: " : ""}Verified Lab Results Ready (${order.orderNumber})`,
          body: `Results for ${patientFullName} have been verified and released by Laboratory.`,
          category: "LAB_RESULT_READY",
          priority,
          read: false,
        },
      });
    });

    await this.audit(actor.userId, "LABORATORY_RESULTS_RELEASED", orderId, requestId);

    return {
      orderId,
      orderNumber: order.orderNumber,
      status: "COMPLETED",
      releasedResultsCount: input.results.length,
      message: "Laboratory results verified and released to requesting clinician.",
    };
  }
}
