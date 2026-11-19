import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { PrismaClient, UserRole, ClinicalMessageCategory, MessagePriority, MessageStatus, ConversationType, ClinicalTaskStatus } from "@prisma/client";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateClinicalMessageInput,
  ListClinicalMessagesQueryInput,
  CreateConversationInput,
  SendConversationMessageInput,
  AcknowledgeMessageInput,
  EscalateMessageInput,
  ConvertMessageToTaskInput,
  UpdateTaskStatusInput,
  ListTasksQueryInput,
  UploadAttachmentInput,
  UserSettingsInput,
} from "./schemas.js";

type AuthActor = {
  userId: string;
  role: UserRole;
  department?: string;
  patientId?: string;
};

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "clinical-attachments");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/dicom",
  "text/plain",
  "text/csv",
  "application/json",
]);

export class ClinicalMessagingService {
  constructor(private readonly database: PrismaClient) {}

  private async audit(actorId: string, action: string, entityId: string, requestId: string, _details?: string) {
    try {
      await this.database.auditLog.create({
        data: {
          actorId,
          action,
          entityType: "ClinicalMessage",
          entityId,
          requestId,
        },
      });
    } catch {
      // Audit log failures should not block clinical messaging flow
    }
  }

  // -------------------------------------------------------------
  // 1. CONVERSATION MANAGEMENT
  // -------------------------------------------------------------
  async createConversation(actor: AuthActor, input: CreateConversationInput, requestId: string) {
    if (actor.role === "PATIENT") {
      throw new HttpError(403, "Patients cannot create internal staff conversations", "FORBIDDEN");
    }

    const memberSet = new Set(input.memberIds);
    memberSet.add(actor.userId);
    const memberIds = Array.from(memberSet);

    // Validate that all members exist and are active staff
    const validStaff = await this.database.user.findMany({
      where: { id: { in: memberIds }, status: "ACTIVE", role: { not: "PATIENT" } },
      select: { id: true, firstName: true, lastName: true, role: true, department: true },
    });
    if (validStaff.length !== memberIds.length) {
      throw new HttpError(400, "One or more conversation participants are invalid or inactive staff", "INVALID_MEMBERS");
    }

    // For DIRECT conversations, check if a direct conversation between these 2 users already exists
    if (input.type === "DIRECT" && memberIds.length === 2) {
      const otherUserId = memberIds.find((id) => id !== actor.userId)!;
      const existing = await this.database.conversation.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            { members: { some: { userId: actor.userId } } },
            { members: { some: { userId: otherUserId } } },
          ],
        },
        include: {
          members: {
            include: { user: { select: { id: true, firstName: true, lastName: true, role: true, department: true } } },
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    // For DEPARTMENT conversations, check if one already exists for this department
    if (input.type === "DEPARTMENT" && input.department) {
      const existing = await this.database.conversation.findFirst({
        where: { type: "DEPARTMENT", department: input.department },
        include: {
          members: {
            include: { user: { select: { id: true, firstName: true, lastName: true, role: true, department: true } } },
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    let defaultTitle = input.title;
    if (!defaultTitle) {
      if (input.type === "DIRECT") {
        const other = validStaff.find((s) => s.id !== actor.userId);
        defaultTitle = other ? `${other.firstName} ${other.lastName}` : "Direct Chat";
      } else if (input.type === "DEPARTMENT") {
        defaultTitle = `${input.department || "Department"} Channel`;
      } else {
        defaultTitle = "Clinical Care Team";
      }
    }

    // Deduplicate member IDs to prevent duplicate membership rows
    const uniqueMemberIds = Array.from(new Set(memberIds));

    const conversation = await this.database.conversation.create({
      data: {
        type: input.type as ConversationType,
        title: defaultTitle,
        department: input.department || actor.department || null,
        patientId: input.patientId || null,
        createdById: actor.userId,
        members: {
          create: uniqueMemberIds.map((userId) => ({
            userId,
            role: userId === actor.userId ? "OWNER" : "MEMBER",
          })),
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true, department: true } } },
        },
        patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
      },
    });

    await this.audit(actor.userId, "CONVERSATION_CREATED", conversation.id, requestId);
    return conversation;
  }

  async listConversations(userId: string) {
    const conversations = await this.database.conversation.findMany({
      where: {
        members: { some: { userId } },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                department: true,
                communicationSettings: { select: { availabilityStatus: true, statusMessage: true } },
              },
            },
          },
        },
        patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            category: true,
            priority: true,
            createdAt: true,
            sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    // Strict deduplication by conversation ID to eliminate duplicate join artifacts
    const uniqueConvMap = new Map<string, (typeof conversations)[number]>();
    for (const conv of conversations) {
      if (conv && conv.id && !uniqueConvMap.has(conv.id)) {
        uniqueConvMap.set(conv.id, conv);
      }
    }
    const uniqueConversations = Array.from(uniqueConvMap.values());

    // Compute unread counts for each conversation
    const result = await Promise.all(
      uniqueConversations.map(async (conv) => {
        const unreadCount = await this.database.messageRecipient.count({
          where: {
            userId,
            status: { in: ["SENT", "DELIVERED"] },
            message: { conversationId: conv.id },
          },
        });

        return {
          id: conv.id,
          type: conv.type,
          title: conv.title || (conv.type === "DEPARTMENT" ? `${conv.department || "Department"} Channel` : "Clinical Conversation"),
          department: conv.department,
          patient: conv.patient,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          members: conv.members.map((m) => ({
            userId: m.userId,
            name: `${m.user.firstName} ${m.user.lastName}`,
            role: m.user.role,
            department: m.user.department,
            conversationRole: m.role,
            availability: m.user.communicationSettings?.availabilityStatus || "ONLINE",
            statusMessage: m.user.communicationSettings?.statusMessage || null,
          })),
          lastMessage: conv.messages[0] || null,
          unreadCount,
        };
      })
    );

    return result;
  }

  async getConversationMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const isMember = await this.database.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!isMember) {
      throw new HttpError(403, "You are not a member of this conversation", "FORBIDDEN");
    }

    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const take = Math.min(100, Math.max(1, limit));

    const [total, messages] = await Promise.all([
      this.database.clinicalMessage.count({ where: { conversationId } }),
      this.database.clinicalMessage.findMany({
        where: { conversationId },
        skip,
        take,
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
          patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
          attachments: { select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true } },
          readReceipts: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
          acknowledgments: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
          tasks: {
            select: { id: true, taskNumber: true, taskType: true, title: true, status: true, priority: true, dueAt: true },
          },
          acknowledgedBy: { select: { id: true, firstName: true, lastName: true } },
          escalatedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    // Mark retrieved messages as read for this user
    const unreadMessageIds = messages.map((m) => m.id);
    if (unreadMessageIds.length > 0) {
      await this.database.messageRecipient.updateMany({
        where: { messageId: { in: unreadMessageIds }, userId, status: { in: ["SENT", "DELIVERED"] } },
        data: { status: "READ", readAt: new Date() },
      });
      await this.database.clinicalNotification.updateMany({
        where: { messageId: { in: unreadMessageIds }, userId, read: false },
        data: { read: true },
      });
    }

    return {
      messages: messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: `${m.sender.firstName} ${m.sender.lastName}`,
        senderRole: m.sender.role,
        senderDepartment: m.sender.department,
        patient: m.patient,
        category: m.category,
        priority: m.priority,
        subject: m.subject,
        content: m.content,
        status: m.status,
        acknowledgedAt: m.acknowledgedAt,
        acknowledgedBy: m.acknowledgedBy ? `${m.acknowledgedBy.firstName} ${m.acknowledgedBy.lastName}` : null,
        acknowledgmentNotes: m.acknowledgmentNotes,
        isEscalated: m.isEscalated,
        escalatedAt: m.escalatedAt,
        escalatedTo: m.escalatedTo ? `${m.escalatedTo.firstName} ${m.escalatedTo.lastName}` : null,
        laboratoryOrderId: m.laboratoryOrderId,
        attachments: m.attachments,
        readReceipts: m.readReceipts.map((rr) => ({ userId: rr.userId, name: `${rr.user.firstName} ${rr.user.lastName}`, readAt: rr.readAt })),
        acknowledgments: m.acknowledgments.map((ak) => ({ userId: ak.userId, name: `${ak.user.firstName} ${ak.user.lastName}`, notes: ak.notes, acknowledgedAt: ak.acknowledgedAt })),
        tasks: m.tasks,
        createdAt: m.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async sendConversationMessage(conversationId: string, actor: AuthActor, input: SendConversationMessageInput, requestId: string) {
    if (actor.role === "PATIENT") {
      throw new HttpError(403, "Patients cannot participate in staff clinical messaging", "FORBIDDEN");
    }

    const conversation = await this.database.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: { select: { userId: true } },
      },
    });
    if (!conversation) throw new HttpError(404, "Conversation not found", "NOT_FOUND");

    const isMember = conversation.members.some((m) => m.userId === actor.userId);
    if (!isMember) throw new HttpError(403, "You are not a member of this conversation", "FORBIDDEN");

    const patientId = input.patientId || conversation.patientId || undefined;
    const department = conversation.department || actor.department || "General";
    const subject = input.subject || `[${input.category}] ${conversation.title || "Message"}`;

    const otherMemberIds = conversation.members
      .map((m) => m.userId)
      .filter((id) => id !== actor.userId);

    const message = await this.database.$transaction(async (tx) => {
      const created = await tx.clinicalMessage.create({
        data: {
          conversationId,
          senderId: actor.userId,
          patientId: patientId || null,
          department,
          category: input.category as ClinicalMessageCategory,
          priority: input.priority as MessagePriority,
          subject,
          content: input.content,
          laboratoryOrderId: input.laboratoryOrderId || null,
          status: "SENT",
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
          patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
        },
      });

      if (otherMemberIds.length > 0) {
        await tx.messageRecipient.createMany({
          data: otherMemberIds.map((userId) => ({
            messageId: created.id,
            userId,
            status: "DELIVERED" as MessageStatus,
            deliveredAt: new Date(),
          })),
        });

        await tx.clinicalNotification.createMany({
          data: otherMemberIds.map((userId) => ({
            userId,
            messageId: created.id,
            laboratoryOrderId: input.laboratoryOrderId || null,
            title: `[${input.priority}] ${created.sender.firstName} ${created.sender.lastName}`,
            body: input.content.slice(0, 150),
            category: "CLINICAL_MESSAGE",
            priority: input.priority as MessagePriority,
            read: false,
          })),
        });
      }

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    await this.audit(actor.userId, "CONVERSATION_MESSAGE_SENT", message.id, requestId);
    return message;
  }

  async addConversationMembers(conversationId: string, actor: AuthActor, memberIds: string[], requestId: string) {
    const conversation = await this.database.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });
    if (!conversation) throw new HttpError(404, "Conversation not found", "NOT_FOUND");

    const actorMembership = conversation.members.find((m) => m.userId === actor.userId);
    if (!actorMembership && actor.role !== "ADMINISTRATOR") {
      throw new HttpError(403, "You do not have permission to manage this conversation", "FORBIDDEN");
    }

    const existingMemberIds = new Set(conversation.members.map((m) => m.userId));
    const newMemberIds = memberIds.filter((id) => !existingMemberIds.has(id));

    if (newMemberIds.length > 0) {
      await this.database.conversationMember.createMany({
        data: newMemberIds.map((userId) => ({
          conversationId,
          userId,
          role: "MEMBER",
        })),
      });
    }

    await this.audit(actor.userId, "CONVERSATION_MEMBERS_ADDED", conversationId, requestId, JSON.stringify(newMemberIds));
    return { addedCount: newMemberIds.length };
  }

  async removeConversationMember(conversationId: string, actor: AuthActor, targetUserId: string, requestId: string) {
    const membership = await this.database.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: actor.userId } },
    });
    if (!membership && actor.role !== "ADMINISTRATOR") {
      throw new HttpError(403, "You do not have permission to manage this conversation", "FORBIDDEN");
    }

    // Owner or Admin or self-removal
    if (actor.userId !== targetUserId && membership?.role !== "OWNER" && actor.role !== "ADMINISTRATOR") {
      throw new HttpError(403, "Only conversation owner or administrator can remove other members", "FORBIDDEN");
    }

    await this.database.conversationMember.deleteMany({
      where: { conversationId, userId: targetUserId },
    });

    await this.audit(actor.userId, "CONVERSATION_MEMBER_REMOVED", conversationId, requestId, targetUserId);
    return { removed: true };
  }

  // -------------------------------------------------------------
  // 2. CLINICAL MESSAGE ACKNOWLEDGMENT
  // -------------------------------------------------------------
  async acknowledgeMessage(messageId: string, actor: AuthActor, input: AcknowledgeMessageInput, requestId: string) {
    if (actor.role === "PATIENT") {
      throw new HttpError(403, "Patients cannot acknowledge clinical instructions", "FORBIDDEN");
    }

    const message = await this.database.clinicalMessage.findUnique({
      where: { id: messageId },
      include: { recipients: true, conversation: { include: { members: true } } },
    });
    if (!message) throw new HttpError(404, "Message not found", "NOT_FOUND");

    const isAuthorized =
      message.recipientId === actor.userId ||
      message.recipients.some((r) => r.userId === actor.userId) ||
      message.conversation?.members.some((m) => m.userId === actor.userId) ||
      actor.role === "ADMINISTRATOR";

    if (!isAuthorized) {
      throw new HttpError(403, "You are not authorized to acknowledge this clinical message", "FORBIDDEN");
    }

    const now = new Date();
    await this.database.$transaction(async (tx) => {
      // 1. Create or update MessageAcknowledgment
      await tx.messageAcknowledgment.upsert({
        where: { messageId_userId: { messageId, userId: actor.userId } },
        update: { acknowledgedAt: now, notes: input.notes || null },
        create: { messageId, userId: actor.userId, notes: input.notes || null, acknowledgedAt: now },
      });

      // 2. Update message level acknowledgment and status
      await tx.clinicalMessage.update({
        where: { id: messageId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: now,
          acknowledgedById: actor.userId,
          acknowledgmentNotes: input.notes || null,
        },
      });

      // 3. Mark recipient record as ACKNOWLEDGED
      await tx.messageRecipient.updateMany({
        where: { messageId, userId: actor.userId },
        data: { status: "ACKNOWLEDGED", readAt: now },
      });

      // 4. Create confirmation notification for sender
      if (message.senderId !== actor.userId) {
        await tx.clinicalNotification.create({
          data: {
            userId: message.senderId,
            messageId,
            title: `Instruction Acknowledged: ${message.subject}`,
            body: `${actor.role} acknowledged your instruction${input.notes ? `: "${input.notes}"` : ""}`,
            category: "CLINICAL_ACKNOWLEDGMENT",
            priority: message.priority,
            read: false,
          },
        });
      }
    });

    await this.audit(actor.userId, "CLINICAL_MESSAGE_ACKNOWLEDGED", messageId, requestId, input.notes);
    return { success: true, messageId, acknowledgedAt: now };
  }

  // -------------------------------------------------------------
  // 3. SUPERVISOR ESCALATION
  // -------------------------------------------------------------
  async escalateMessage(messageId: string, actor: AuthActor, input: EscalateMessageInput, requestId: string) {
    const message = await this.database.clinicalMessage.findUnique({
      where: { id: messageId },
      include: { sender: true, patient: true },
    });
    if (!message) throw new HttpError(404, "Message not found", "NOT_FOUND");

    let supervisorId = input.supervisorId;
    if (!supervisorId) {
      // Find department head or system admin
      const supervisor = await this.database.user.findFirst({
        where: {
          status: "ACTIVE",
          OR: [
            { department: message.department, role: "DEPARTMENT_HEAD" },
            { role: "ADMINISTRATOR" },
          ],
        },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!supervisor) {
        throw new HttpError(404, "No active supervisor or department head found for escalation", "SUPERVISOR_NOT_FOUND");
      }
      supervisorId = supervisor.id;
    }

    const now = new Date();
    await this.database.$transaction(async (tx) => {
      await tx.clinicalMessage.update({
        where: { id: messageId },
        data: {
          isEscalated: true,
          escalatedAt: now,
          escalatedToId: supervisorId,
        },
      });

      // Ensure supervisor is a recipient
      await tx.messageRecipient.upsert({
        where: { messageId_userId: { messageId, userId: supervisorId } },
        update: { status: "DELIVERED", deliveredAt: now },
        create: { messageId, userId: supervisorId, status: "DELIVERED", deliveredAt: now },
      });

      // Create high-priority critical notification
      await tx.clinicalNotification.create({
        data: {
          userId: supervisorId,
          messageId,
          title: `[ESCALATED] Urgent Unacknowledged Instruction`,
          body: `Escalated clinical instruction for Patient ${message.patient ? message.patient.firstName + " " + message.patient.lastName : "Record"}. Reason: ${input.reason || "Unacknowledged within safety threshold"}`,
          category: "SUPERVISOR_ESCALATION",
          priority: "CRITICAL",
          read: false,
        },
      });
    });

    await this.audit(actor.userId, "CLINICAL_MESSAGE_ESCALATED", messageId, requestId, `Escalated to ${supervisorId}: ${input.reason || "Safety threshold"}`);
    return { success: true, messageId, isEscalated: true, escalatedToId: supervisorId, escalatedAt: now };
  }

  // -------------------------------------------------------------
  // 4. MESSAGE-TO-TASK CONVERSION (CLINICAL WORKFLOW AUTOMATION)
  // -------------------------------------------------------------
  async convertMessageToTask(messageId: string, actor: AuthActor, input: ConvertMessageToTaskInput, requestId: string) {
    if (actor.role === "PATIENT") {
      throw new HttpError(403, "Patients cannot create clinical tasks", "FORBIDDEN");
    }

    const message = await this.database.clinicalMessage.findUnique({
      where: { id: messageId },
      include: { patient: true },
    });
    if (!message) throw new HttpError(404, "Source message not found", "NOT_FOUND");

    // Task number format: TSK-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const taskNumber = `TSK-${dateStr}-${randSuffix}`;

    const task = await this.database.$transaction(async (tx) => {
      const created = await tx.clinicalTask.create({
        data: {
          taskNumber,
          messageId,
          conversationId: message.conversationId,
          patientId: message.patientId,
          department: input.department || message.department,
          taskType: input.taskType,
          title: input.title,
          description: input.description || message.content,
          priority: (input.priority || message.priority) as MessagePriority,
          status: "PENDING",
          createdById: actor.userId,
          assignedToId: input.assignedToId || null,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
        },
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
        },
      });

      if (input.assignedToId && input.assignedToId !== actor.userId) {
        await tx.clinicalNotification.create({
          data: {
            userId: input.assignedToId,
            messageId,
            title: `New Clinical Task Assigned: ${input.title}`,
            body: `Assigned by ${actor.role}. Task #${taskNumber} (${input.taskType})`,
            category: "TASK_ASSIGNED",
            priority: (input.priority || message.priority) as MessagePriority,
            read: false,
          },
        });
      }

      return created;
    });

    await this.audit(actor.userId, "CLINICAL_TASK_CREATED", task.id, requestId, `Converted from message ${messageId} to task ${taskNumber}`);
    return task;
  }

  async listTasks(actor: AuthActor, query: ListTasksQueryInput) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: import("@prisma/client").Prisma.ClinicalTaskWhereInput = {
      ...(query.status ? { status: query.status as ClinicalTaskStatus } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.department ? { department: query.department } : {}),
      ...(query.priority ? { priority: query.priority as MessagePriority } : {}),
      ...(query.search ? {
        OR: [
          { title: { contains: query.search } },
          { description: { contains: query.search } },
          { taskNumber: { contains: query.search } },
          { patient: { firstName: { contains: query.search } } },
          { patient: { lastName: { contains: query.search } } },
          { patient: { patientNumber: { contains: query.search } } },
        ],
      } : {}),
    };

    const [total, tasks] = await Promise.all([
      this.database.clinicalTask.count({ where }),
      this.database.clinicalTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      items: tasks.map((t) => ({
        id: t.id,
        taskNumber: t.taskNumber,
        messageId: t.messageId,
        conversationId: t.conversationId,
        patientId: t.patientId,
        patientNumber: t.patient?.patientNumber ?? null,
        patientName: t.patient ? `${t.patient.firstName} ${t.patient.lastName}` : null,
        department: t.department,
        taskType: t.taskType,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        createdById: t.createdById,
        createdByName: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
        createdByRole: t.createdBy.role,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : null,
        assignedToRole: t.assignedTo?.role ?? null,
        dueAt: t.dueAt,
        acknowledgedAt: t.acknowledgedAt,
        completedAt: t.completedAt,
        completionNotes: t.completionNotes,
        isEscalated: t.isEscalated,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateTaskStatus(taskId: string, actor: AuthActor, input: UpdateTaskStatusInput, requestId: string) {
    const task = await this.database.clinicalTask.findUnique({
      where: { id: taskId },
      include: { createdBy: true },
    });
    if (!task) throw new HttpError(404, "Task not found", "NOT_FOUND");

    const now = new Date();
    const updateData: import("@prisma/client").Prisma.ClinicalTaskUpdateInput = {
      status: input.status,
      updatedAt: now,
    };

    if (input.status === "ACKNOWLEDGED") {
      updateData.acknowledgedAt = now;
    } else if (input.status === "COMPLETED") {
      updateData.completedAt = now;
      if (input.completionNotes) updateData.completionNotes = input.completionNotes;
    } else if (input.status === "CANCELLED") {
      if (input.completionNotes) updateData.completionNotes = input.completionNotes;
    }

    const updated = await this.database.clinicalTask.update({
      where: { id: taskId },
      data: updateData,
    });

    // Notify task creator when task is completed
    if (input.status === "COMPLETED" && task.createdById !== actor.userId) {
      await this.database.clinicalNotification.create({
        data: {
          userId: task.createdById,
          messageId: task.messageId,
          title: `Task Completed: ${task.title}`,
          body: `Completed by ${actor.role}. Notes: ${input.completionNotes || "Done"}`,
          category: "TASK_COMPLETED",
          priority: task.priority,
          read: false,
        },
      });
    }

    await this.audit(actor.userId, "CLINICAL_TASK_STATUS_UPDATED", taskId, requestId, `Status: ${input.status}`);
    return updated;
  }

  // -------------------------------------------------------------
  // 5. ATTACHMENT MANAGEMENT
  // -------------------------------------------------------------
  async uploadAttachment(messageId: string, actor: AuthActor, input: UploadAttachmentInput, requestId: string) {
    const message = await this.database.clinicalMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new HttpError(404, "Message not found", "NOT_FOUND");

    if (!ALLOWED_MIME_TYPES.has(input.fileType)) {
      throw new HttpError(400, `Unsupported file type: ${input.fileType}. Allowed: PDF, JPEG, PNG, WEBP, DICOM, CSV, TXT`, "INVALID_FILE_TYPE");
    }

    const buffer = Buffer.from(input.fileBase64, "base64");
    if (buffer.length > 15 * 1024 * 1024) {
      throw new HttpError(400, "Attachment exceeds maximum size of 15MB", "PAYLOAD_TOO_LARGE");
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = path.basename(input.fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${crypto.randomUUID()}-${safeName}`;
    const fullPath = path.join(UPLOAD_DIR, storageKey);

    await fs.writeFile(fullPath, buffer);

    const attachment = await this.database.messageAttachment.create({
      data: {
        messageId,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: buffer.length,
        storageKey,
        uploadedById: actor.userId,
      },
    });

    await this.audit(actor.userId, "ATTACHMENT_UPLOADED", attachment.id, requestId, `File: ${input.fileName} (${buffer.length} bytes)`);

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      createdAt: attachment.createdAt,
    };
  }

  async downloadAttachment(attachmentId: string, actor: AuthActor, requestId: string) {
    const attachment = await this.database.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        message: {
          include: {
            recipients: true,
            conversation: { include: { members: true } },
          },
        },
      },
    });
    if (!attachment) throw new HttpError(404, "Attachment not found", "NOT_FOUND");

    const message = attachment.message;
    const isAuthorized =
      message.senderId === actor.userId ||
      message.recipientId === actor.userId ||
      message.recipients.some((r) => r.userId === actor.userId) ||
      message.conversation?.members.some((m) => m.userId === actor.userId) ||
      actor.role === "ADMINISTRATOR";

    if (!isAuthorized) {
      throw new HttpError(403, "Access to attachment denied", "FORBIDDEN");
    }

    const fullPath = path.join(UPLOAD_DIR, path.basename(attachment.storageKey));
    try {
      const data = await fs.readFile(fullPath);
      await this.audit(actor.userId, "ATTACHMENT_DOWNLOADED", attachment.id, requestId);
      return {
        buffer: data,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
      };
    } catch {
      throw new HttpError(404, "Attachment file data not found on server", "FILE_NOT_FOUND");
    }
  }

  // -------------------------------------------------------------
  // 6. USER COMMUNICATION SETTINGS
  // -------------------------------------------------------------
  async getUserSettings(userId: string) {
    let settings = await this.database.userCommunicationSettings.findUnique({
      where: { userId },
    });
    if (!settings) {
      settings = await this.database.userCommunicationSettings.create({
        data: {
          userId,
          availabilityStatus: "ONLINE",
          statusMessage: "Available for clinical consultation",
          soundEnabled: true,
          emailNotifications: false,
          minNotificationPriority: "ROUTINE",
          preferredLanguage: "en",
          autoEscalationPolicy: true,
        },
      });
    }
    return settings;
  }

  async updateUserSettings(userId: string, input: UserSettingsInput) {
    const updated = await this.database.userCommunicationSettings.upsert({
      where: { userId },
      update: {
        ...(input.availabilityStatus ? { availabilityStatus: input.availabilityStatus } : {}),
        ...(input.statusMessage !== undefined ? { statusMessage: input.statusMessage } : {}),
        ...(input.soundEnabled !== undefined ? { soundEnabled: input.soundEnabled } : {}),
        ...(input.emailNotifications !== undefined ? { emailNotifications: input.emailNotifications } : {}),
        ...(input.minNotificationPriority ? { minNotificationPriority: input.minNotificationPriority as MessagePriority } : {}),
        ...(input.preferredLanguage ? { preferredLanguage: input.preferredLanguage } : {}),
        ...(input.autoEscalationPolicy !== undefined ? { autoEscalationPolicy: input.autoEscalationPolicy } : {}),
      },
      create: {
        userId,
        availabilityStatus: input.availabilityStatus || "ONLINE",
        statusMessage: input.statusMessage || null,
        soundEnabled: input.soundEnabled ?? true,
        emailNotifications: input.emailNotifications ?? false,
        minNotificationPriority: (input.minNotificationPriority as MessagePriority) || "ROUTINE",
        preferredLanguage: input.preferredLanguage || "en",
        autoEscalationPolicy: input.autoEscalationPolicy ?? true,
      },
    });
    return updated;
  }

  // -------------------------------------------------------------
  // 7. IN-APP CLINICAL NOTIFICATIONS
  // -------------------------------------------------------------
  async listNotifications(userId: string, unreadOnly = false) {
    const where: import("@prisma/client").Prisma.ClinicalNotificationWhereInput = {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [total, unreadCount, items] = await Promise.all([
      this.database.clinicalNotification.count({ where }),
      this.database.clinicalNotification.count({ where: { userId, read: false } }),
      this.database.clinicalNotification.findMany({
        where,
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { items, total, unreadCount };
  }

  async markNotificationRead(notificationId: string, userId: string) {
    await this.database.clinicalNotification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    return { success: true };
  }

  async markAllNotificationsRead(userId: string) {
    await this.database.clinicalNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  // -------------------------------------------------------------
  // 8. DIRECT CLINICAL MESSAGING (INBOX, SENT, STANDALONE)
  // -------------------------------------------------------------
  async sendMessage(actor: AuthActor, input: CreateClinicalMessageInput, requestId: string) {
    if (actor.role === "PATIENT") {
      throw new HttpError(403, "Patients cannot send internal clinical staff messages", "FORBIDDEN");
    }

    let patientName: string | null = null;
    if (input.patientId) {
      const patient = await this.database.patient.findUnique({
        where: { id: input.patientId },
        select: { id: true, firstName: true, middleName: true, lastName: true, patientNumber: true },
      });
      if (!patient) throw new HttpError(404, "Patient not found", "PATIENT_NOT_FOUND");
      patientName = [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" ");
    }

    // Determine target recipient IDs
    const targetRecipientIds = new Set<string>();

    if (input.recipientId) {
      const recipientUser = await this.database.user.findUnique({
        where: { id: input.recipientId },
        select: { id: true, role: true, status: true },
      });
      if (!recipientUser || recipientUser.status !== "ACTIVE" || recipientUser.role === "PATIENT") {
        throw new HttpError(400, "Specified recipient is not an active hospital staff member", "INVALID_RECIPIENT");
      }
      targetRecipientIds.add(recipientUser.id);
    } else if (input.recipientRole) {
      const staffList = await this.database.user.findMany({
        where: {
          role: input.recipientRole,
          status: "ACTIVE",
          ...(input.department ? { department: input.department } : {}),
        },
        select: { id: true },
      });
      for (const s of staffList) targetRecipientIds.add(s.id);
    }

    // Exclude sender from recipients if included
    targetRecipientIds.delete(actor.userId);

    const message = await this.database.$transaction(async (tx) => {
      const created = await tx.clinicalMessage.create({
        data: {
          conversationId: input.conversationId || null,
          senderId: actor.userId,
          recipientId: input.recipientId || null,
          recipientRole: input.recipientRole || null,
          patientId: input.patientId || null,
          department: input.department,
          category: input.category as ClinicalMessageCategory,
          priority: input.priority as MessagePriority,
          subject: input.subject,
          content: input.content,
          parentMessageId: input.parentMessageId || null,
          laboratoryOrderId: input.laboratoryOrderId || null,
          status: "SENT",
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
          recipient: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
          patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
        },
      });

      // Create MessageRecipient records
      const recipientEntries = Array.from(targetRecipientIds).map((userId) => ({
        messageId: created.id,
        userId,
        status: "DELIVERED" as MessageStatus,
        deliveredAt: new Date(),
      }));

      if (recipientEntries.length > 0) {
        await tx.messageRecipient.createMany({ data: recipientEntries });
      }

      // Create ClinicalNotification for each recipient
      const notifCategory = input.category === "LABORATORY_ALERT" ? "LAB_RESULT_READY" : "CLINICAL_MESSAGE";
      const notifTitle = `[${input.priority}] ${input.subject}`;
      const notifBody = patientName
        ? `Message regarding Patient ${patientName} from Dr./Sr. ${created.sender.firstName} ${created.sender.lastName}`
        : `Message from ${created.sender.firstName} ${created.sender.lastName} (${created.sender.department || "Staff"})`;

      const notifications = Array.from(targetRecipientIds).map((userId) => ({
        userId,
        messageId: created.id,
        laboratoryOrderId: input.laboratoryOrderId || null,
        title: notifTitle,
        body: notifBody,
        category: notifCategory,
        priority: input.priority as MessagePriority,
        read: false,
      }));

      if (notifications.length > 0) {
        await tx.clinicalNotification.createMany({ data: notifications });
      }

      return created;
    });

    await this.audit(actor.userId, "CLINICAL_MESSAGE_SENT", message.id, requestId);

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      senderRole: message.sender.role,
      senderDepartment: message.sender.department,
      recipientId: message.recipientId,
      recipientName: message.recipient ? `${message.recipient.firstName} ${message.recipient.lastName}` : null,
      recipientRole: message.recipientRole,
      department: message.department,
      patientId: message.patientId,
      patientNumber: message.patient?.patientNumber ?? null,
      patientName: message.patient ? `${message.patient.firstName} ${message.patient.lastName}` : null,
      category: message.category,
      priority: message.priority,
      subject: message.subject,
      content: message.content,
      status: message.status,
      laboratoryOrderId: message.laboratoryOrderId,
      createdAt: message.createdAt,
    };
  }

  async replyMessage(messageId: string, actor: AuthActor, content: string, priority: MessagePriority | undefined, requestId: string) {
    const parent = await this.database.clinicalMessage.findUnique({
      where: { id: messageId },
      include: { sender: true, recipient: true },
    });
    if (!parent) throw new HttpError(404, "Message not found", "NOT_FOUND");

    const recipientId = parent.senderId === actor.userId ? parent.recipientId : parent.senderId;

    return this.sendMessage(actor, {
      conversationId: parent.conversationId || undefined,
      recipientId: recipientId || undefined,
      department: parent.department,
      patientId: parent.patientId || undefined,
      category: parent.category,
      priority: priority || parent.priority,
      subject: parent.subject.startsWith("Re: ") ? parent.subject : `Re: ${parent.subject}`,
      content,
      parentMessageId: parent.parentMessageId || parent.id,
      laboratoryOrderId: parent.laboratoryOrderId || undefined,
    }, requestId);
  }

  async listInbox(userId: string, query: ListClinicalMessagesQueryInput) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 30));
    const skip = (page - 1) * limit;

    const recipientFilter: import("@prisma/client").Prisma.MessageRecipientWhereInput = {
      userId,
      ...(query.unreadOnly ? { status: { in: ["SENT", "DELIVERED"] } } : {}),
    };

    const where: import("@prisma/client").Prisma.ClinicalMessageWhereInput = {
      recipients: { some: recipientFilter },
      parentMessageId: null,
      ...(query.category ? { category: query.category as ClinicalMessageCategory } : {}),
      ...(query.priority ? { priority: query.priority as MessagePriority } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.search ? {
        OR: [
          { subject: { contains: query.search } },
          { content: { contains: query.search } },
          { patient: { firstName: { contains: query.search } } },
          { patient: { lastName: { contains: query.search } } },
          { patient: { patientNumber: { contains: query.search } } },
          { sender: { firstName: { contains: query.search } } },
          { sender: { lastName: { contains: query.search } } },
        ],
      } : {}),
    };

    const [total, unreadCount, urgentCount, items] = await Promise.all([
      this.database.clinicalMessage.count({ where }),
      this.database.messageRecipient.count({
        where: { userId, status: { in: ["SENT", "DELIVERED"] } },
      }),
      this.database.messageRecipient.count({
        where: {
          userId,
          status: { in: ["SENT", "DELIVERED"] },
          message: { priority: { in: ["URGENT", "STAT", "CRITICAL"] } },
        },
      }),
      this.database.clinicalMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
          recipient: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
          patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
          recipients: { where: { userId }, select: { status: true, readAt: true } },
          replies: { select: { id: true, createdAt: true } },
          attachments: { select: { id: true, fileName: true, fileType: true, fileSize: true } },
          tasks: { select: { id: true, taskNumber: true, status: true, title: true } },
          _count: { select: { replies: true } },
        },
      }),
    ]);

    return {
      items: items.map((m) => {
        const myRecipient = m.recipients[0];
        const isRead = myRecipient?.status === "READ" || myRecipient?.status === "ACKNOWLEDGED";
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderName: `${m.sender.firstName} ${m.sender.lastName}`,
          senderRole: m.sender.role,
          senderDepartment: m.sender.department,
          recipientId: m.recipientId,
          recipientName: m.recipient ? `${m.recipient.firstName} ${m.recipient.lastName}` : null,
          recipientRole: m.recipientRole,
          department: m.department,
          patientId: m.patientId,
          patientNumber: m.patient?.patientNumber ?? null,
          patientName: m.patient ? `${m.patient.firstName} ${m.patient.lastName}` : null,
          category: m.category,
          priority: m.priority,
          subject: m.subject,
          content: m.content,
          status: m.status,
          acknowledgedAt: m.acknowledgedAt,
          isEscalated: m.isEscalated,
          isRead,
          readAt: myRecipient?.readAt ?? null,
          repliesCount: m._count.replies,
          attachmentsCount: m.attachments.length,
          tasksCount: m.tasks.length,
          laboratoryOrderId: m.laboratoryOrderId,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        };
      }),
      total,
      unreadCount,
      urgentCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listSent(userId: string, query: ListClinicalMessagesQueryInput) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: import("@prisma/client").Prisma.ClinicalMessageWhereInput = {
      senderId: userId,
      parentMessageId: null,
      ...(query.category ? { category: query.category as ClinicalMessageCategory } : {}),
      ...(query.priority ? { priority: query.priority as MessagePriority } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.search ? {
        OR: [
          { subject: { contains: query.search } },
          { content: { contains: query.search } },
          { patient: { firstName: { contains: query.search } } },
          { patient: { lastName: { contains: query.search } } },
        ],
      } : {}),
    };

    const [total, items] = await Promise.all([
      this.database.clinicalMessage.count({ where }),
      this.database.clinicalMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          recipient: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
          patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
          recipients: {
            include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
          },
          attachments: { select: { id: true, fileName: true, fileType: true, fileSize: true } },
          tasks: { select: { id: true, taskNumber: true, status: true } },
          _count: { select: { replies: true } },
        },
      }),
    ]);

    return {
      items: items.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        recipientId: m.recipientId,
        recipientName: m.recipient ? `${m.recipient.firstName} ${m.recipient.lastName}` : null,
        recipientRole: m.recipientRole,
        department: m.department,
        patientId: m.patientId,
        patientNumber: m.patient?.patientNumber ?? null,
        patientName: m.patient ? `${m.patient.firstName} ${m.patient.lastName}` : null,
        category: m.category,
        priority: m.priority,
        subject: m.subject,
        content: m.content,
        status: m.status,
        acknowledgedAt: m.acknowledgedAt,
        isEscalated: m.isEscalated,
        repliesCount: m._count.replies,
        attachmentsCount: m.attachments.length,
        tasksCount: m.tasks.length,
        recipients: m.recipients.map((r) => ({
          userId: r.userId,
          name: `${r.user.firstName} ${r.user.lastName}`,
          role: r.user.role,
          status: r.status,
          readAt: r.readAt,
        })),
        laboratoryOrderId: m.laboratoryOrderId,
        createdAt: m.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversation(messageId: string, userId: string) {
    const rootMessage = await this.database.clinicalMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true, department: true, email: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, role: true, department: true, email: true } },
        patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true, sex: true, dateOfBirth: true, department: true } },
        recipients: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
        readReceipts: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
        acknowledgments: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
        attachments: {
          select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true },
        },
        tasks: {
          include: {
            assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, role: true, department: true } },
            readReceipts: {
              include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
            },
            attachments: {
              select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!rootMessage) throw new HttpError(404, "Message not found", "NOT_FOUND");

    await this.markAsRead(rootMessage.id, userId);

    return {
      id: rootMessage.id,
      conversationId: rootMessage.conversationId,
      sender: rootMessage.sender,
      recipient: rootMessage.recipient,
      recipientRole: rootMessage.recipientRole,
      department: rootMessage.department,
      patient: rootMessage.patient,
      category: rootMessage.category,
      priority: rootMessage.priority,
      subject: rootMessage.subject,
      content: rootMessage.content,
      status: rootMessage.status,
      acknowledgedAt: rootMessage.acknowledgedAt,
      acknowledgedById: rootMessage.acknowledgedById,
      acknowledgmentNotes: rootMessage.acknowledgmentNotes,
      isEscalated: rootMessage.isEscalated,
      escalatedAt: rootMessage.escalatedAt,
      laboratoryOrderId: rootMessage.laboratoryOrderId,
      createdAt: rootMessage.createdAt,
      attachments: rootMessage.attachments,
      tasks: rootMessage.tasks.map((t) => ({
        id: t.id,
        taskNumber: t.taskNumber,
        title: t.title,
        taskType: t.taskType,
        status: t.status,
        priority: t.priority,
        assignedToName: t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : null,
        dueAt: t.dueAt,
        completedAt: t.completedAt,
      })),
      recipients: rootMessage.recipients.map((r) => ({
        userId: r.userId,
        name: `${r.user.firstName} ${r.user.lastName}`,
        role: r.user.role,
        status: r.status,
        deliveredAt: r.deliveredAt,
        readAt: r.readAt,
      })),
      readReceipts: rootMessage.readReceipts.map((rr) => ({
        userId: rr.userId,
        name: `${rr.user.firstName} ${rr.user.lastName}`,
        readAt: rr.readAt,
      })),
      acknowledgments: rootMessage.acknowledgments.map((ak) => ({
        userId: ak.userId,
        name: `${ak.user.firstName} ${ak.user.lastName}`,
        notes: ak.notes,
        acknowledgedAt: ak.acknowledgedAt,
      })),
      replies: rootMessage.replies.map((reply) => ({
        id: reply.id,
        senderId: reply.senderId,
        senderName: `${reply.sender.firstName} ${reply.sender.lastName}`,
        senderRole: reply.sender.role,
        senderDepartment: reply.sender.department,
        subject: reply.subject,
        content: reply.content,
        priority: reply.priority,
        attachments: reply.attachments,
        createdAt: reply.createdAt,
      })),
    };
  }

  async markAsRead(messageId: string, userId: string) {
    await this.database.$transaction(async (tx) => {
      await tx.messageRecipient.updateMany({
        where: { messageId, userId, status: { in: ["SENT", "DELIVERED"] } },
        data: { status: "READ", readAt: new Date() },
      });

      await tx.messageReadReceipt.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { readAt: new Date() },
        create: { messageId, userId, readAt: new Date() },
      });

      await tx.clinicalNotification.updateMany({
        where: { messageId, userId, read: false },
        data: { read: true },
      });
    });

    return { markedRead: true };
  }

  async getUnreadCounts(userId: string) {
    const [totalUnread, urgentUnread] = await Promise.all([
      this.database.messageRecipient.count({
        where: { userId, status: { in: ["SENT", "DELIVERED"] } },
      }),
      this.database.messageRecipient.count({
        where: {
          userId,
          status: { in: ["SENT", "DELIVERED"] },
          message: { priority: { in: ["URGENT", "STAT", "CRITICAL"] } },
        },
      }),
    ]);

    return {
      unreadCount: totalUnread,
      urgentCount: urgentUnread,
    };
  }

  async getStaffDirectory(department?: string) {
    const staff = await this.database.user.findMany({
      where: {
        status: "ACTIVE",
        role: { not: "PATIENT" },
        ...(department ? { department } : {}),
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        department: true,
        email: true,
        phone: true,
        communicationSettings: { select: { availabilityStatus: true, statusMessage: true } },
      },
      orderBy: [{ department: "asc" }, { lastName: "asc" }],
    });

    return staff.map((s) => ({
      id: s.id,
      name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
      role: s.role,
      department: s.department || "General",
      email: s.email,
      phone: s.phone || "",
      availability: s.communicationSettings?.availabilityStatus || "ONLINE",
      statusMessage: s.communicationSettings?.statusMessage || null,
    }));
  }

  async getPatientMessages(patientId: string) {
    const messages = await this.database.clinicalMessage.findMany({
      where: { patientId, parentMessageId: null },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, role: true } },
        _count: { select: { replies: true } },
      },
    });

    return messages.map((m) => ({
      id: m.id,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`,
      senderRole: m.sender.role,
      recipientName: m.recipient ? `${m.recipient.firstName} ${m.recipient.lastName}` : null,
      recipientRole: m.recipientRole,
      department: m.department,
      category: m.category,
      priority: m.priority,
      subject: m.subject,
      content: m.content,
      repliesCount: m._count.replies,
      createdAt: m.createdAt,
    }));
  }

  async getAdminMetrics() {
    const [
      totalConversations,
      directCount,
      departmentCount,
      groupCount,
      totalMessages,
      routineMessages,
      importantMessages,
      urgentMessages,
      statMessages,
      criticalMessages,
      unacknowledgedUrgent,
      escalatedCount,
      totalTasks,
      pendingTasks,
      completedTasks,
      attachmentsAgg,
      totalNotifications,
      recentAuditCount,
    ] = await Promise.all([
      this.database.conversation.count(),
      this.database.conversation.count({ where: { type: "DIRECT" } }),
      this.database.conversation.count({ where: { type: "DEPARTMENT" } }),
      this.database.conversation.count({ where: { type: "GROUP" } }),
      this.database.clinicalMessage.count(),
      this.database.clinicalMessage.count({ where: { priority: "ROUTINE" } }),
      this.database.clinicalMessage.count({ where: { priority: "IMPORTANT" } }),
      this.database.clinicalMessage.count({ where: { priority: "URGENT" } }),
      this.database.clinicalMessage.count({ where: { priority: "STAT" } }),
      this.database.clinicalMessage.count({ where: { priority: "CRITICAL" } }),
      this.database.clinicalMessage.count({
        where: {
          priority: { in: ["URGENT", "STAT", "CRITICAL"] },
          acknowledgedAt: null,
        },
      }),
      this.database.clinicalMessage.count({ where: { isEscalated: true } }),
      this.database.clinicalTask.count(),
      this.database.clinicalTask.count({ where: { status: "PENDING" } }),
      this.database.clinicalTask.count({ where: { status: "COMPLETED" } }),
      this.database.messageAttachment.aggregate({
        _count: { id: true },
        _sum: { fileSize: true },
      }),
      this.database.clinicalNotification.count(),
      this.database.auditLog.count({
        where: {
          entityType: "ClinicalMessage",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      serviceStatus: "HEALTHY",
      uptimeSeconds: process.uptime(),
      conversations: {
        total: totalConversations,
        direct: directCount,
        department: departmentCount,
        group: groupCount,
      },
      messages: {
        total: totalMessages,
        byPriority: {
          routine: routineMessages,
          important: importantMessages,
          urgent: urgentMessages,
          stat: statMessages,
          critical: criticalMessages,
        },
        unacknowledgedUrgent,
        escalatedToSupervisor: escalatedCount,
      },
      workflowTasks: {
        total: totalTasks,
        pending: pendingTasks,
        completed: completedTasks,
      },
      attachments: {
        totalFiles: attachmentsAgg._count.id,
        totalBytesUsed: attachmentsAgg._sum.fileSize || 0,
      },
      notifications: {
        totalDispatched: totalNotifications,
      },
      compliance: {
        auditEvents24h: recentAuditCount,
        retentionPolicy: "30_DAYS_CLINICAL_ACTIVE_7_YEARS_ARCHIVE",
      },
    };
  }
}
