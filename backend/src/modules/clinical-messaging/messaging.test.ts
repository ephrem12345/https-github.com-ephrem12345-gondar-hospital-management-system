import { describe, expect, it } from "vitest";
import {
  createConversationSchema,
  sendConversationMessageSchema,
  createClinicalMessageSchema,
  acknowledgeMessageSchema,
  escalateMessageSchema,
  convertMessageToTaskSchema,
  updateTaskStatusSchema,
  uploadAttachmentSchema,
  userSettingsSchema,
} from "./schemas.js";

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";
const VALID_UUID_3 = "33333333-3333-4333-8333-333333333333";

describe("Phase 2 Clinical Messaging Schemas and Business Rules", () => {
  describe("1. Conversation Creation Validation", () => {
    it("validates direct 1:1 conversation between staff members", () => {
      const parsed = createConversationSchema.safeParse({
        type: "DIRECT",
        memberIds: [VALID_UUID_1],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.type).toBe("DIRECT");
        expect(parsed.data.memberIds).toEqual([VALID_UUID_1]);
      }
    });

    it("rejects DIRECT conversation without any target members", () => {
      const parsed = createConversationSchema.safeParse({
        type: "DIRECT",
        memberIds: [],
      });
      expect(parsed.success).toBe(false);
    });

    it("validates department channel creation", () => {
      const parsed = createConversationSchema.safeParse({
        type: "DEPARTMENT",
        department: "Emergency",
        title: "Emergency Staff Channel",
        memberIds: [VALID_UUID_1, VALID_UUID_2],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.department).toBe("Emergency");
      }
    });

    it("validates multi-disciplinary care group with patient context", () => {
      const parsed = createConversationSchema.safeParse({
        type: "GROUP",
        title: "Ward 4 Care Team - Post-Op Monitoring",
        patientId: VALID_UUID_3,
        memberIds: [VALID_UUID_1, VALID_UUID_2],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.patientId).toBe(VALID_UUID_3);
        expect(parsed.data.memberIds.length).toBe(2);
      }
    });
  });

  describe("2. Clinical Message Validation and Priorities", () => {
    it("accepts valid clinical instruction with ROUTINE priority", () => {
      const parsed = sendConversationMessageSchema.safeParse({
        content: "Please check morning vitals for bed 12.",
        category: "CLINICAL_INSTRUCTION",
        priority: "ROUTINE",
        patientId: VALID_UUID_1,
      });
      expect(parsed.success).toBe(true);
    });

    it("accepts STAT critical lab result alert with lab order context", () => {
      const parsed = sendConversationMessageSchema.safeParse({
        content: "CRITICAL LAB VALUE: Potassium is 6.8 mEq/L. Requires immediate review.",
        category: "LABORATORY_ALERT",
        priority: "CRITICAL",
        patientId: VALID_UUID_1,
        laboratoryOrderId: VALID_UUID_2,
        subject: "STAT Potassium Critical Alert",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.priority).toBe("CRITICAL");
        expect(parsed.data.laboratoryOrderId).toBe(VALID_UUID_2);
      }
    });

    it("rejects empty message content", () => {
      const parsed = sendConversationMessageSchema.safeParse({
        content: "",
        category: "GENERAL_CONSULTATION",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid priority level", () => {
      const parsed = sendConversationMessageSchema.safeParse({
        content: "Test message",
        priority: "SUPER_URGENT" as unknown,
      });
      expect(parsed.success).toBe(false);
    });

    it("validates standalone cross-department message with department and subject", () => {
      const parsed = createClinicalMessageSchema.safeParse({
        department: "Internal Medicine",
        subject: "Post-op admission handover",
        content: "Patient transferred from OR to Ward 2, vitals stable.",
        category: "NURSING_CARE",
        priority: "IMPORTANT",
        patientId: VALID_UUID_1,
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("3. Explicit Clinical Acknowledgment", () => {
    it("validates acknowledgment with clinical verification notes", () => {
      const parsed = acknowledgeMessageSchema.safeParse({
        notes: "Administered 10 units insulin IV as instructed. Blood glucose re-check scheduled in 30 minutes.",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.notes).toContain("Administered 10 units");
      }
    });

    it("allows acknowledgment without optional notes", () => {
      const parsed = acknowledgeMessageSchema.safeParse({});
      expect(parsed.success).toBe(true);
    });
  });

  describe("4. Supervisor Safety Escalation", () => {
    it("validates escalation to department supervisor for unacknowledged critical instruction", () => {
      const parsed = escalateMessageSchema.safeParse({
        supervisorId: VALID_UUID_1,
        reason: "Unacknowledged STAT order after 15 minutes. Escalating to shift supervisor.",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.supervisorId).toBe(VALID_UUID_1);
      }
    });
  });

  describe("5. Message-to-Task Conversion (ClinicalTask)", () => {
    it("validates converting clinical message into structured task", () => {
      const parsed = convertMessageToTaskSchema.safeParse({
        taskType: "MEDICATION_ADMINISTRATION",
        title: "Administer IV Ceftriaxone 1g",
        description: "Patient GHMS-01042, pre-op prophylaxis",
        department: "Surgery",
        priority: "URGENT",
        assignedToId: VALID_UUID_2,
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.taskType).toBe("MEDICATION_ADMINISTRATION");
        expect(parsed.data.priority).toBe("URGENT");
      }
    });

    it("validates task status progression to COMPLETED with completion notes", () => {
      const parsed = updateTaskStatusSchema.safeParse({
        status: "COMPLETED",
        completionNotes: "Administered 1g IV push per protocol. Patient tolerated well.",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.status).toBe("COMPLETED");
      }
    });
  });

  describe("6. Secure Clinical Attachment Validation", () => {
    it("accepts valid PDF clinical report under size limit", () => {
      const parsed = uploadAttachmentSchema.safeParse({
        fileName: "echocardiogram_report.pdf",
        fileType: "application/pdf",
        fileBase64: Buffer.from("PDF Mock Content").toString("base64"),
      });
      expect(parsed.success).toBe(true);
    });

    it("accepts valid PNG diagnostic image", () => {
      const parsed = uploadAttachmentSchema.safeParse({
        fileName: "chest_xray.png",
        fileType: "image/png",
        fileBase64: Buffer.from("PNG Mock Content").toString("base64"),
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects attachment with missing fileBase64", () => {
      const parsed = uploadAttachmentSchema.safeParse({
        fileName: "test.pdf",
        fileType: "application/pdf",
        fileBase64: "",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("7. Communication and Notification Preferences", () => {
    it("validates staff presence and availability status", () => {
      const statuses = ["ONLINE", "BUSY", "IN_SURGERY", "ON_CALL", "OFFLINE"] as const;
      for (const status of statuses) {
        const parsed = userSettingsSchema.safeParse({
          availabilityStatus: status,
          statusMessage: `Current status: ${status}`,
        });
        expect(parsed.success).toBe(true);
      }
    });

    it("validates notification toggles and minimum priority", () => {
      const parsed = userSettingsSchema.safeParse({
        emailNotifications: true,
        soundEnabled: false,
        minNotificationPriority: "URGENT",
        preferredLanguage: "am",
        autoEscalationPolicy: true,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.minNotificationPriority).toBe("URGENT");
        expect(parsed.data.preferredLanguage).toBe("am");
      }
    });
  });
});
