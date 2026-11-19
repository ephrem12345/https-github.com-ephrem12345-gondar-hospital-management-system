import { apiClient } from "./api-client";

export type MessagePriority = "ROUTINE" | "IMPORTANT" | "URGENT" | "STAT" | "CRITICAL";
export type MessageStatus = "SENT" | "DELIVERED" | "READ" | "ACKNOWLEDGED";
export type ConversationType = "DIRECT" | "DEPARTMENT" | "GROUP";
export type ClinicalTaskStatus = "PENDING" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface ConversationMember {
  userId: string;
  name: string;
  role: string;
  department?: string | null;
  conversationRole: string;
  availability: "ONLINE" | "BUSY" | "IN_SURGERY" | "ON_CALL" | "OFFLINE";
  statusMessage: string | null;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string;
  department: string | null;
  patient: { id: string; patientNumber: string; firstName: string; lastName: string } | null;
  members: ConversationMember[];
  lastMessage: {
    id: string;
    content: string;
    category: string;
    priority: MessagePriority;
    createdAt: string;
    sender: { id: string; firstName: string; lastName: string; role: string };
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface ClinicalTaskSummary {
  id: string;
  taskNumber: string;
  taskType: string;
  title: string;
  status: ClinicalTaskStatus;
  priority: MessagePriority;
  dueAt?: string | null;
}

export interface ClinicalMessage {
  id: string;
  conversationId: string | null;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderDepartment: string | null;
  patient: { id: string; patientNumber: string; firstName: string; lastName: string } | null;
  category: string;
  priority: MessagePriority;
  subject: string;
  content: string;
  status: MessageStatus;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgmentNotes: string | null;
  isEscalated: boolean;
  escalatedAt: string | null;
  escalatedTo: string | null;
  laboratoryOrderId: string | null;
  attachments: MessageAttachment[];
  tasks: ClinicalTaskSummary[];
  createdAt: string;
}

export interface ClinicalTask {
  id: string;
  taskNumber: string;
  messageId: string | null;
  conversationId: string | null;
  patientNumber: string | null;
  patientName: string | null;
  department: string;
  taskType: string;
  title: string;
  description: string | null;
  priority: MessagePriority;
  status: ClinicalTaskStatus;
  createdById: string;
  createdByName: string;
  createdByRole: string;
  assignedToId?: string | null;
  assignedToName: string | null;
  assignedToRole: string | null;
  dueAt: string | null;
  acknowledgedAt: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  isEscalated: boolean;
  createdAt: string;
}

export interface StaffDirectoryItem {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  availability: "ONLINE" | "BUSY" | "IN_SURGERY" | "ON_CALL" | "OFFLINE";
  statusMessage: string | null;
}

export interface UserCommunicationSettings {
  id?: string;
  userId: string;
  availabilityStatus: "ONLINE" | "BUSY" | "IN_SURGERY" | "ON_CALL" | "OFFLINE";
  statusMessage: string | null;
  soundEnabled: boolean;
  emailNotifications: boolean;
  minNotificationPriority: MessagePriority;
  preferredLanguage: string;
  autoEscalationPolicy: boolean;
}

export interface ClinicalNotificationItem {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: MessagePriority;
  read: boolean;
  createdAt: string;
}

// -------------------------------------------------------------
// DEMO FIXTURES (FALLBACK PREVIEW)
// -------------------------------------------------------------
const demoStaff: StaffDirectoryItem[] = [
  { id: "staff-doc-01", name: "Dr. Selam Girma", role: "DOCTOR", department: "Internal Medicine", email: "selam.girma@gondar-hospital.et", phone: "+251 911 234 567", availability: "ONLINE", statusMessage: "Rounding in Ward 3" },
  { id: "staff-doc-02", name: "Dr. Dawit Mengistu", role: "DOCTOR", department: "Emergency", email: "dawit.mengistu@gondar-hospital.et", phone: "+251 911 345 678", availability: "IN_SURGERY", statusMessage: "In Emergency OR 1" },
  { id: "staff-nur-01", name: "Sr. Tigist Alemu", role: "NURSE", department: "Internal Medicine", email: "tigist.alemu@gondar-hospital.et", phone: "+251 911 456 789", availability: "ONLINE", statusMessage: "Internal Medicine Station" },
  { id: "staff-lab-01", name: "Getu Assefa", role: "LABORATORY_TECHNICIAN", department: "Laboratory", email: "getu.assefa@gondar-hospital.et", phone: "+251 911 567 890", availability: "ONLINE", statusMessage: "Clinical Chemistry Lab" },
  { id: "staff-phm-01", name: "Liya Tesfaye", role: "PHARMACIST", department: "Pharmacy", email: "liya.tesfaye@gondar-hospital.et", phone: "+251 911 678 901", availability: "ONLINE", statusMessage: "Inpatient Dispensary" },
  { id: "staff-rad-01", name: "Yared Haile", role: "RADIOLOGY_TECHNICIAN", department: "Radiology", email: "yared.haile@gondar-hospital.et", phone: "+251 911 789 012", availability: "ON_CALL", statusMessage: "CT / Ultrasound Unit" },
  { id: "staff-adm-01", name: "Abebe Bekele", role: "ADMINISTRATOR", department: "Administration", email: "abebe.bekele@gondar-hospital.et", phone: "+251 911 890 123", availability: "ONLINE", statusMessage: "Hospital Administration" },
];

const demoConversations: Conversation[] = [
  {
    id: "conv-demo-01",
    type: "DIRECT",
    title: "Sr. Tigist Alemu (Nurse)",
    department: "Internal Medicine",
    patient: { id: "p-01", patientNumber: "GHMS-2026-00104", firstName: "Almaz", lastName: "Kebede" },
    members: [
      { userId: "current-user", name: "Dr. Selam Girma", role: "DOCTOR", conversationRole: "OWNER", availability: "ONLINE", statusMessage: "Attending ward" },
      { userId: "staff-nur-01", name: "Sr. Tigist Alemu", role: "NURSE", conversationRole: "MEMBER", availability: "ONLINE", statusMessage: "Internal Medicine Station" },
    ],
    lastMessage: {
      id: "msg-01",
      content: "Please check morning vitals and titrate IV fluid rate to 80 mL/hr as charted.",
      category: "CLINICAL_INSTRUCTION",
      priority: "IMPORTANT",
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      sender: { id: "current-user", firstName: "Selam", lastName: "Girma", role: "DOCTOR" },
    },
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "conv-demo-02",
    type: "DEPARTMENT",
    title: "Emergency Care Channel",
    department: "Emergency",
    patient: null,
    members: [
      { userId: "staff-doc-02", name: "Dr. Dawit Mengistu", role: "DOCTOR", conversationRole: "OWNER", availability: "IN_SURGERY", statusMessage: "Emergency OR" },
      { userId: "current-user", name: "Staff Member", role: "DOCTOR", conversationRole: "MEMBER", availability: "ONLINE", statusMessage: "On duty" },
    ],
    lastMessage: {
      id: "msg-02",
      content: "Incoming multi-trauma referral from Debre Tabor. ICU bed 2 requested on standby.",
      category: "GENERAL_CONSULTATION",
      priority: "CRITICAL",
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      sender: { id: "staff-doc-02", firstName: "Dawit", lastName: "Mengistu", role: "DOCTOR" },
    },
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "conv-demo-03",
    type: "DIRECT",
    title: "Getu Assefa (Lab)",
    department: "Laboratory",
    patient: { id: "p-02", patientNumber: "GHMS-2026-00219", firstName: "Tadesse", lastName: "Wondimu" },
    members: [
      { userId: "staff-lab-01", name: "Getu Assefa", role: "LABORATORY_TECHNICIAN", conversationRole: "OWNER", availability: "ONLINE", statusMessage: "Chemistry Lab" },
      { userId: "current-user", name: "Dr. Selam Girma", role: "DOCTOR", conversationRole: "MEMBER", availability: "ONLINE", statusMessage: "Ward" },
    ],
    lastMessage: {
      id: "msg-03",
      content: "CRITICAL ALERT: Potassium result 6.8 mmol/L for Patient Tadesse Wondimu. Specimen re-run verified.",
      category: "LABORATORY_ALERT",
      priority: "CRITICAL",
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      sender: { id: "staff-lab-01", firstName: "Getu", lastName: "Assefa", role: "LABORATORY_TECHNICIAN" },
    },
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
];

const demoMessages: Record<string, ClinicalMessage[]> = {
  "conv-demo-01": [
    {
      id: "msg-01-a",
      conversationId: "conv-demo-01",
      senderId: "current-user",
      senderName: "Dr. Selam Girma",
      senderRole: "DOCTOR",
      senderDepartment: "Internal Medicine",
      patient: { id: "p-01", patientNumber: "GHMS-2026-00104", firstName: "Almaz", lastName: "Kebede" },
      category: "CLINICAL_INSTRUCTION",
      priority: "IMPORTANT",
      subject: "Post-admission IV Fluid & Monitoring",
      content: "Please check morning vitals and titrate IV fluid rate to 80 mL/hr as charted. Notify if SpO2 drops below 94%.",
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      acknowledgedBy: "Sr. Tigist Alemu",
      acknowledgmentNotes: "Vitals taken (BP 125/82, SpO2 96%, HR 78). IV rate adjusted to 80 mL/hr.",
      isEscalated: false,
      escalatedAt: null,
      escalatedTo: null,
      laboratoryOrderId: null,
      attachments: [],
      tasks: [
        {
          id: "task-demo-01",
          taskNumber: "TSK-20261116-4011",
          taskType: "NURSING_CARE",
          title: "Vitals Check & IV Titration (Bed 3B)",
          status: "COMPLETED",
          priority: "IMPORTANT",
          dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
  ],
  "conv-demo-02": [
    {
      id: "msg-02",
      conversationId: "conv-demo-02",
      senderId: "staff-doc-02",
      senderName: "Dr. Dawit Mengistu",
      senderRole: "DOCTOR",
      senderDepartment: "Emergency",
      patient: null,
      category: "GENERAL_CONSULTATION",
      priority: "CRITICAL",
      subject: "Incoming Trauma & ICU Bed Request",
      content: "Incoming multi-trauma referral from Debre Tabor. ICU bed 2 requested on standby with ventilator prepared.",
      status: "DELIVERED",
      acknowledgedAt: null,
      acknowledgedBy: null,
      acknowledgmentNotes: null,
      isEscalated: false,
      escalatedAt: null,
      escalatedTo: null,
      laboratoryOrderId: null,
      attachments: [],
      tasks: [],
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ],
  "conv-demo-03": [
    {
      id: "msg-03",
      conversationId: "conv-demo-03",
      senderId: "staff-lab-01",
      senderName: "Getu Assefa",
      senderRole: "LABORATORY_TECHNICIAN",
      senderDepartment: "Laboratory",
      patient: { id: "p-02", patientNumber: "GHMS-2026-00219", firstName: "Tadesse", lastName: "Wondimu" },
      category: "LABORATORY_ALERT",
      priority: "CRITICAL",
      subject: "CRITICAL LAB RESULT: Serum Potassium 6.8 mmol/L",
      content: "CRITICAL ALERT: Serum Potassium result 6.8 mmol/L for Patient Tadesse Wondimu. Specimen re-run verified on analyzer. Immediate clinical review required.",
      status: "DELIVERED",
      acknowledgedAt: null,
      acknowledgedBy: null,
      acknowledgmentNotes: null,
      isEscalated: false,
      escalatedAt: null,
      escalatedTo: null,
      laboratoryOrderId: "lab-ord-01",
      attachments: [
        { id: "att-01", fileName: "electrolytes-panel-GHMS-00219.pdf", fileType: "application/pdf", fileSize: 184520, createdAt: new Date().toISOString() },
      ],
      tasks: [],
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
  ],
};

const demoTasks: ClinicalTask[] = [
  {
    id: "task-demo-01",
    taskNumber: "TSK-20261116-4011",
    messageId: "msg-01-a",
    conversationId: "conv-demo-01",
    patientNumber: "GHMS-2026-00104",
    patientName: "Almaz Kebede",
    department: "Internal Medicine",
    taskType: "NURSING_CARE",
    title: "Vitals Check & IV Titration (Bed 3B)",
    description: "Check morning vitals and titrate IV fluid rate to 80 mL/hr as charted.",
    priority: "IMPORTANT",
    status: "COMPLETED",
    createdById: "current-user",
    createdByName: "Dr. Selam Girma",
    createdByRole: "DOCTOR",
    assignedToId: "staff-nur-01",
    assignedToName: "Sr. Tigist Alemu",
    assignedToRole: "NURSE",
    dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    completionNotes: "Vitals stable (BP 125/82, HR 78, SpO2 96%). Rate adjusted.",
    isEscalated: false,
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: "task-demo-02",
    taskNumber: "TSK-20261116-7822",
    messageId: "msg-03",
    conversationId: "conv-demo-03",
    patientNumber: "GHMS-2026-00219",
    patientName: "Tadesse Wondimu",
    department: "Internal Medicine",
    taskType: "MEDICATION_ORDER",
    title: "Urgent Hyperkalemia Management (Bed 4A)",
    description: "Administer 10% Calcium Gluconate IV and Nebulized Salbutamol STAT. Re-check ECG.",
    priority: "CRITICAL",
    status: "PENDING",
    createdById: "staff-doc-01",
    createdByName: "Dr. Selam Girma",
    createdByRole: "DOCTOR",
    assignedToId: "staff-nur-01",
    assignedToName: "Sr. Tigist Alemu",
    assignedToRole: "NURSE",
    dueAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    acknowledgedAt: null,
    completedAt: null,
    completionNotes: null,
    isEscalated: false,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

// -------------------------------------------------------------
// CONVERSATION DEDUPLICATION HELPER
// -------------------------------------------------------------
export function deduplicateConversations(convs: Conversation[]): Conversation[] {
  if (!Array.isArray(convs)) return [];
  const map = new Map<string, Conversation>();
  for (const c of convs) {
    if (!c || !c.id) continue;
    const safeTitle = c.title || (c.type === "DEPARTMENT" ? `${c.department || "Department"} Channel` : "Clinical Conversation");
    const existing = map.get(c.id);
    if (!existing) {
      map.set(c.id, {
        ...c,
        title: safeTitle,
        members: Array.isArray(c.members) ? c.members : [],
        unreadCount: typeof c.unreadCount === "number" ? c.unreadCount : 0,
      });
    } else {
      // Merge duplicate records preserving the newest timestamp, lastMessage and members
      const existingTime = new Date(existing.updatedAt || existing.lastMessage?.createdAt || 0).getTime();
      const newTime = new Date(c.updatedAt || c.lastMessage?.createdAt || 0).getTime();
      const validExisting = !isNaN(existingTime) ? existingTime : 0;
      const validNew = !isNaN(newTime) ? newTime : 0;
      const newer = validNew >= validExisting ? c : existing;
      const older = validNew >= validExisting ? existing : c;

      map.set(c.id, {
        ...older,
        ...newer,
        title: newer.title || older.title || safeTitle,
        members: (Array.isArray(newer.members) && newer.members.length > 0) ? newer.members : (Array.isArray(older.members) ? older.members : []),
        lastMessage: newer.lastMessage || older.lastMessage,
        unreadCount: typeof newer.unreadCount === "number" ? newer.unreadCount : (typeof older.unreadCount === "number" ? older.unreadCount : 0),
      });
    }
  }
  return Array.from(map.values());
}

// -------------------------------------------------------------
// SERVICE CLIENT CLASS
// -------------------------------------------------------------
export class ClinicalMessagingService {
  async listConversations(): Promise<Conversation[]> {
    try {
      const res = await apiClient.get<Conversation[]>("/clinical-messages/conversations");
      const list = Array.isArray(res) ? res : demoConversations;
      return deduplicateConversations(list);
    } catch {
      return deduplicateConversations(demoConversations);
    }
  }

  async createConversation(input: {
    type: ConversationType;
    title?: string;
    department?: string;
    patientId?: string;
    memberIds: string[];
  }): Promise<Conversation> {
    try {
      return await apiClient.post<Conversation>("/clinical-messages/conversations", input);
    } catch {
      // In demo/offline mode, check if a matching conversation already exists to avoid duplicates
      if (input.type === "DEPARTMENT" && input.department) {
        const found = demoConversations.find((d) => d.type === "DEPARTMENT" && d.department?.toLowerCase() === input.department?.toLowerCase());
        if (found) return found;
      }
      if (input.type === "DIRECT" && input.memberIds.length === 1) {
        const found = demoConversations.find((d) => d.type === "DIRECT" && d.members.some((m) => m.userId === input.memberIds[0]));
        if (found) return found;
      }

      const newConv: Conversation = {
        id: `conv-demo-${Date.now()}`,
        type: input.type,
        title: input.title || (input.type === "DEPARTMENT" ? `${input.department} Channel` : "New Care Group"),
        department: input.department || "General",
        patient: null,
        members: [
          { userId: "current-user", name: "Current Clinician", role: "DOCTOR", conversationRole: "OWNER", availability: "ONLINE", statusMessage: "Active" },
          ...input.memberIds.map((id) => {
            const found = demoStaff.find((s) => s.id === id);
            return {
              userId: id,
              name: found ? found.name : "Staff Member",
              role: found ? found.role : "HOSPITAL_STAFF",
              conversationRole: "MEMBER",
              availability: found ? found.availability : "ONLINE",
              statusMessage: null,
            };
          }),
        ],
        lastMessage: null,
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      };
      demoConversations.unshift(newConv);
      return newConv;
    }
  }

  async getConversationMessages(
    conversationId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: ClinicalMessage[]; total: number }> {
    try {
      const res = await apiClient.get<{ messages: ClinicalMessage[]; total: number }>(
        `/clinical-messages/conversations/${encodeURIComponent(conversationId)}/messages`,
        { page, limit },
      );
      return res;
    } catch {
      const list = demoMessages[conversationId] || [];
      return { messages: list, total: list.length };
    }
  }

  async sendConversationMessage(
    conversationId: string,
    input: {
      content: string;
      category?: string;
      priority?: MessagePriority;
      patientId?: string;
      laboratoryOrderId?: string;
      subject?: string;
    },
  ): Promise<ClinicalMessage> {
    try {
      return await apiClient.post<ClinicalMessage>(
        `/clinical-messages/conversations/${encodeURIComponent(conversationId)}/messages`,
        input,
      );
    } catch {
      const newMsg: ClinicalMessage = {
        id: `msg-demo-${Date.now()}`,
        conversationId,
        senderId: "current-user",
        senderName: "Current Clinician",
        senderRole: "DOCTOR",
        senderDepartment: "Internal Medicine",
        patient: null,
        category: input.category || "CLINICAL_INSTRUCTION",
        priority: input.priority || "ROUTINE",
        subject: input.subject || `Message (${input.priority || "ROUTINE"})`,
        content: input.content,
        status: "DELIVERED",
        acknowledgedAt: null,
        acknowledgedBy: null,
        acknowledgmentNotes: null,
        isEscalated: false,
        escalatedAt: null,
        escalatedTo: null,
        laboratoryOrderId: input.laboratoryOrderId || null,
        attachments: [],
        tasks: [],
        createdAt: new Date().toISOString(),
      };
      if (!demoMessages[conversationId]) demoMessages[conversationId] = [];
      demoMessages[conversationId].push(newMsg);
      return newMsg;
    }
  }

  async addConversationMembers(conversationId: string, memberIds: string[]): Promise<{ addedCount: number }> {
    try {
      return await apiClient.post<{ addedCount: number }>(
        `/clinical-messages/conversations/${encodeURIComponent(conversationId)}/members`,
        { memberIds },
      );
    } catch {
      return { addedCount: memberIds.length };
    }
  }

  async removeConversationMember(conversationId: string, userId: string): Promise<{ removed: boolean }> {
    try {
      return await apiClient.delete<{ removed: boolean }>(
        `/clinical-messages/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(userId)}`,
      );
    } catch {
      return { removed: true };
    }
  }

  async acknowledgeMessage(messageId: string, notes?: string): Promise<{ success: boolean; acknowledgedAt: string }> {
    try {
      return await apiClient.post<{ success: boolean; acknowledgedAt: string }>(
        `/clinical-messages/${encodeURIComponent(messageId)}/acknowledge`,
        { notes },
      );
    } catch {
      return { success: true, acknowledgedAt: new Date().toISOString() };
    }
  }

  async escalateMessage(messageId: string, input?: { supervisorId?: string; reason?: string }): Promise<{ success: boolean; isEscalated: boolean }> {
    try {
      return await apiClient.post<{ success: boolean; isEscalated: boolean }>(
        `/clinical-messages/${encodeURIComponent(messageId)}/escalate`,
        input || {},
      );
    } catch {
      return { success: true, isEscalated: true };
    }
  }

  async convertMessageToTask(
    messageId: string,
    input: {
      taskType: string;
      title: string;
      description?: string;
      department?: string;
      priority?: MessagePriority;
      assignedToId?: string;
      dueAt?: string;
    },
  ): Promise<ClinicalTask> {
    try {
      return await apiClient.post<ClinicalTask>(
        `/clinical-messages/${encodeURIComponent(messageId)}/convert-task`,
        input,
      );
    } catch {
      const newTask: ClinicalTask = {
        id: `task-demo-${Date.now()}`,
        taskNumber: `TSK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
        messageId,
        conversationId: null,
        patientNumber: "GHMS-2026-00104",
        patientName: "Patient Record",
        department: input.department || "General",
        taskType: input.taskType,
        title: input.title,
        description: input.description || null,
        priority: input.priority || "ROUTINE",
        status: "PENDING",
        createdById: "current-user",
        createdByName: "Current Clinician",
        createdByRole: "DOCTOR",
        assignedToId: input.assignedToId || null,
        assignedToName: input.assignedToId ? "Assigned Staff" : null,
        assignedToRole: null,
        dueAt: input.dueAt || null,
        acknowledgedAt: null,
        completedAt: null,
        completionNotes: null,
        isEscalated: false,
        createdAt: new Date().toISOString(),
      };
      demoTasks.unshift(newTask);
      return newTask;
    }
  }

  async listTasks(query?: {
    status?: ClinicalTaskStatus;
    assignedToId?: string;
    patientId?: string;
    department?: string;
    priority?: MessagePriority;
    search?: string;
  }): Promise<{ items: ClinicalTask[]; total: number }> {
    try {
      return await apiClient.get<{ items: ClinicalTask[]; total: number }>("/clinical-messages/tasks", query);
    } catch {
      let filtered = [...demoTasks];
      if (query?.status) filtered = filtered.filter((t) => t.status === query.status);
      if (query?.priority) filtered = filtered.filter((t) => t.priority === query.priority);
      return { items: filtered, total: filtered.length };
    }
  }

  async updateTaskStatus(
    taskId: string,
    input: { status: ClinicalTaskStatus; completionNotes?: string },
  ): Promise<ClinicalTask> {
    try {
      return await apiClient.patch<ClinicalTask>(
        `/clinical-messages/tasks/${encodeURIComponent(taskId)}/status`,
        input,
      );
    } catch {
      const task = demoTasks.find((t) => t.id === taskId);
      if (task) {
        task.status = input.status;
        if (input.status === "COMPLETED") {
          task.completedAt = new Date().toISOString();
          task.completionNotes = input.completionNotes || null;
        } else if (input.status === "ACKNOWLEDGED") {
          task.acknowledgedAt = new Date().toISOString();
        }
        return task;
      }
      throw new Error("Task not found");
    }
  }

  async uploadAttachment(
    messageId: string,
    input: { fileName: string; fileType: string; fileBase64: string },
  ): Promise<MessageAttachment> {
    return apiClient.post<MessageAttachment>(
      `/clinical-messages/${encodeURIComponent(messageId)}/attachments`,
      input,
    );
  }

  getAttachmentDownloadUrl(attachmentId: string): string {
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/+$/, "");
    return `${base}/clinical-messages/attachments/${encodeURIComponent(attachmentId)}/download`;
  }

  async getUserSettings(): Promise<UserCommunicationSettings> {
    try {
      return await apiClient.get<UserCommunicationSettings>("/clinical-messages/settings");
    } catch {
      return {
        userId: "current-user",
        availabilityStatus: "ONLINE",
        statusMessage: "Available for clinical consultation",
        soundEnabled: true,
        emailNotifications: false,
        minNotificationPriority: "ROUTINE",
        preferredLanguage: "en",
        autoEscalationPolicy: true,
      };
    }
  }

  async updateUserSettings(input: Partial<UserCommunicationSettings>): Promise<UserCommunicationSettings> {
    return apiClient.patch<UserCommunicationSettings>("/clinical-messages/settings", input);
  }

  async listNotifications(unreadOnly = false): Promise<{ items: ClinicalNotificationItem[]; total: number; unreadCount: number }> {
    try {
      return await apiClient.get<{ items: ClinicalNotificationItem[]; total: number; unreadCount: number }>(
        "/clinical-messages/notifications",
        { unreadOnly },
      );
    } catch {
      return { items: [], total: 0, unreadCount: 0 };
    }
  }

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return apiClient.patch<{ success: boolean }>(`/clinical-messages/notifications/${encodeURIComponent(id)}/read`, {});
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/clinical-messages/notifications/read-all");
  }

  async getStaffDirectory(department?: string): Promise<StaffDirectoryItem[]> {
    try {
      const res = await apiClient.get<StaffDirectoryItem[]>("/clinical-messages/staff-directory", { department });
      return Array.isArray(res) && res.length > 0 ? res : demoStaff;
    } catch {
      return department ? demoStaff.filter((s) => s.department === department) : demoStaff;
    }
  }

  async getUnreadCounts(): Promise<{ unreadCount: number; urgentCount: number }> {
    try {
      return await apiClient.get<{ unreadCount: number; urgentCount: number }>("/clinical-messages/unread-count");
    } catch {
      return { unreadCount: 2, urgentCount: 1 };
    }
  }

  async getPatientHistory(patientId: string): Promise<ClinicalMessage[]> {
    try {
      return await apiClient.get<ClinicalMessage[]>(`/clinical-messages/patient-history/${encodeURIComponent(patientId)}`);
    } catch {
      return [];
    }
  }

  async getAdminMetrics(): Promise<any> {
    return apiClient.get("/clinical-messages/admin/metrics");
  }
}

export const clinicalMessagingService = new ClinicalMessagingService();
