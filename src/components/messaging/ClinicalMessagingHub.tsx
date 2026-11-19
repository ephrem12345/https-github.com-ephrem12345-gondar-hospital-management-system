"use client";

import { useEffect, useState, useMemo, useRef, type ChangeEvent } from "react";
import {
  MessageSquare,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Paperclip,
  Send,
  Plus,
  Search,
  CheckCheck,
  ShieldAlert,
  ArrowUpRight,
  FileText,
  UserCheck,
  Bell,
  Volume2,
  VolumeX,
  Settings,
  ChevronRight,
  X,
  User,
  Activity,
  Flame,
  Download,
  ListTodo,
} from "lucide-react";
import {
  clinicalMessagingService,
  deduplicateConversations,
  type Conversation,
  type ClinicalMessage,
  type ClinicalTask,
  type StaffDirectoryItem,
  type MessagePriority,
  type ClinicalTaskStatus,
  type UserCommunicationSettings,
} from "@/services/clinical-messaging";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/**
 * Formats ISO timestamp into local time safely without throwing RangeError.
 */
function safeFormatTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Merges new conversation(s) into the existing array, ensuring 100% unique IDs,
 * placing incoming items at the top and preserving newest metadata.
 */
function mergeUniqueConversations(
  prev: Conversation[] = [],
  incoming: Conversation | Conversation[]
): Conversation[] {
  const incomingList = Array.isArray(incoming) ? incoming : [incoming];
  return deduplicateConversations([...incomingList, ...(Array.isArray(prev) ? prev : [])]);
}

export function ClinicalMessagingHub({ initialPatientId }: { initialPatientId?: string }) {
  const { language } = useTranslation();
  const isAm = language === "am";

  // Tab & Selection state
  const [activeTab, setActiveTab] = useState<"conversations" | "tasks" | "directory">("conversations");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ClinicalMessage[]>([]);
  const [tasks, setTasks] = useState<ClinicalTask[]>([]);
  const [staffList, setStaffList] = useState<StaffDirectoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // User Settings & Presence
  const [settings, setSettings] = useState<UserCommunicationSettings>({
    userId: "current-user",
    availabilityStatus: "ONLINE",
    statusMessage: "Available for consultation",
    soundEnabled: true,
    emailNotifications: false,
    minNotificationPriority: "ROUTINE",
    preferredLanguage: isAm ? "am" : "en",
    autoEscalationPolicy: true,
  });

  // Composer state
  const [inputContent, setInputContent] = useState("");
  const [inputPriority, setInputPriority] = useState<MessagePriority>("ROUTINE");
  const [inputCategory, setInputCategory] = useState("CLINICAL_INSTRUCTION");
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(initialPatientId);
  const [pendingAttachment, setPendingAttachment] = useState<{ name: string; type: string; base64: string; size: number } | null>(null);
  const [sending, setSending] = useState(false);

  // Dialog & Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState<ClinicalMessage | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState<ClinicalMessage | null>(null);
  const [showAckModal, setShowAckModal] = useState<ClinicalMessage | null>(null);
  const [ackNotes, setAckNotes] = useState("");
  const [escalateReason, setEscalateReason] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    taskType: "NURSING_CARE",
    description: "",
    priority: "ROUTINE" as MessagePriority,
    assignedToId: "",
    dueHours: "2",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load
  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [convList, taskList, staffDir, userSet] = await Promise.all([
          clinicalMessagingService.listConversations(),
          clinicalMessagingService.listTasks(),
          clinicalMessagingService.getStaffDirectory(),
          clinicalMessagingService.getUserSettings(),
        ]);
        if (!active) return;
        const dedupedList = deduplicateConversations(convList || []);
        setConversations(dedupedList);
        setTasks(taskList?.items || []);
        setStaffList(Array.isArray(staffDir) ? staffDir : []);
        if (userSet) setSettings(userSet);

        if (dedupedList.length > 0 && !selectedConversationId) {
          setSelectedConversationId(dedupedList[0].id);
        }
      } catch (err) {
        console.error("Failed to load clinical messaging data", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadInitialData();
    return () => { active = false; };
  }, []);

  // 2. Load Active Conversation Messages
  useEffect(() => {
    if (!selectedConversationId) return;
    let active = true;
    const fetchMessages = async () => {
      try {
        const res = await clinicalMessagingService.getConversationMessages(selectedConversationId);
        if (active && res && Array.isArray(res.messages)) {
          setMessages(res.messages);
          scrollToBottom();
        }
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    void fetchMessages();
    const interval = setInterval(() => {
      void fetchMessages();
    }, 6000); // Polling for real-time updates

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedConversationId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Selected conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  // Filtered Conversations (guaranteed strictly unique by conv.id before rendering)
  const filteredConversations = useMemo(() => {
    const deduped = deduplicateConversations(conversations);
    const q = searchQuery.trim().toLowerCase();
    return deduped.filter((c) => {
      const titleStr = (c.title || "").toLowerCase();
      const deptStr = (c.department || "").toLowerCase();
      const matchesSearch =
        q === "" ||
        titleStr.includes(q) ||
        deptStr.includes(q) ||
        (Array.isArray(c.members) && c.members.some((m) => (m.name || "").toLowerCase().includes(q))) ||
        (c.patient && (`${c.patient.firstName || ""} ${c.patient.lastName || ""}`).toLowerCase().includes(q));

      const matchesPriority =
        priorityFilter === "ALL" ||
        (priorityFilter === "URGENT" && (c.lastMessage?.priority === "URGENT" || c.lastMessage?.priority === "CRITICAL" || c.lastMessage?.priority === "STAT"));

      return matchesSearch && matchesPriority;
    });
  }, [conversations, searchQuery, priorityFilter]);

  // Send Message
  const handleSendMessage = async () => {
    if (!selectedConversationId || (!inputContent.trim() && !pendingAttachment)) return;
    setSending(true);

    try {
      const sentMsg = await clinicalMessagingService.sendConversationMessage(selectedConversationId, {
        content: inputContent.trim() || `[Attachment: ${pendingAttachment?.name}]`,
        category: inputCategory,
        priority: inputPriority,
        patientId: selectedPatientId,
      });

      // If there was an attachment, upload it to the newly created message
      if (pendingAttachment) {
        await clinicalMessagingService.uploadAttachment(sentMsg.id, {
          fileName: pendingAttachment.name,
          fileType: pendingAttachment.type,
          fileBase64: pendingAttachment.base64,
        });
        setPendingAttachment(null);
      }

      setInputContent("");
      // Refresh messages
      const res = await clinicalMessagingService.getConversationMessages(selectedConversationId);
      if (res && Array.isArray(res.messages)) {
        setMessages(res.messages);
        scrollToBottom();
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  // Handle File Input
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert(isAm ? "ፋይሉ ከ 15 ሜጋባይት መብለጥ የለበትም" : "Attachment file size cannot exceed 15MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setPendingAttachment({
        name: file.name,
        type: file.type || "application/octet-stream",
        base64,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle Acknowledge Message
  const handleAcknowledge = async () => {
    if (!showAckModal) return;
    try {
      await clinicalMessagingService.acknowledgeMessage(showAckModal.id, ackNotes);
      setShowAckModal(null);
      setAckNotes("");
      if (selectedConversationId) {
        const res = await clinicalMessagingService.getConversationMessages(selectedConversationId);
        if (res && Array.isArray(res.messages)) {
          setMessages(res.messages);
        }
      }
    } catch (err) {
      console.error("Failed to acknowledge", err);
    }
  };

  // Handle Escalate Message
  const handleEscalate = async () => {
    if (!showEscalateModal) return;
    try {
      await clinicalMessagingService.escalateMessage(showEscalateModal.id, { reason: escalateReason });
      setShowEscalateModal(null);
      setEscalateReason("");
      if (selectedConversationId) {
        const res = await clinicalMessagingService.getConversationMessages(selectedConversationId);
        if (res && Array.isArray(res.messages)) {
          setMessages(res.messages);
        }
      }
    } catch (err) {
      console.error("Failed to escalate", err);
    }
  };

  // Handle Convert to Task
  const handleCreateTask = async () => {
    if (!showTaskModal || !taskForm.title.trim()) return;
    try {
      const hours = parseInt(taskForm.dueHours || "2", 10);
      const safeHours = isNaN(hours) ? 2 : hours;
      const dueAt = new Date(Date.now() + safeHours * 60 * 60 * 1000).toISOString();
      const createdTask = await clinicalMessagingService.convertMessageToTask(showTaskModal.id, {
        taskType: taskForm.taskType,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || showTaskModal.content || "",
        department: activeConversation?.department || "General",
        priority: taskForm.priority,
        assignedToId: taskForm.assignedToId || undefined,
        dueAt,
      });

      setShowTaskModal(null);
      if (createdTask) {
        setTasks((prev) => [createdTask, ...(Array.isArray(prev) ? prev : [])]);
      }

      // Refresh messages
      if (selectedConversationId) {
        const res = await clinicalMessagingService.getConversationMessages(selectedConversationId);
        if (res && Array.isArray(res.messages)) {
          setMessages(res.messages);
        }
      }
    } catch (err) {
      console.error("Failed to convert task", err);
    }
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, status: ClinicalTaskStatus) => {
    try {
      const updated = await clinicalMessagingService.updateTaskStatus(taskId, {
        status,
        completionNotes: status === "COMPLETED" ? "Completed via Clinical Messaging Hub" : undefined,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      console.error("Failed to update task status", err);
    }
  };

  // Update Presence Status
  const handleAvailabilityChange = async (availabilityStatus: "ONLINE" | "BUSY" | "IN_SURGERY" | "ON_CALL" | "OFFLINE") => {
    try {
      const updated = await clinicalMessagingService.updateUserSettings({ availabilityStatus });
      setSettings(updated);
    } catch {
      setSettings((prev) => ({ ...prev, availabilityStatus }));
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 dark:bg-slate-950 lg:flex-row">
      {/* ============================================================ */}
      {/* 1. LEFT SIDEBAR: CONVERSATIONS, TASKS & DIRECTORY           */}
      {/* ============================================================ */}
      <aside className="flex w-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:w-80 xl:w-96">
        {/* User Presence & Hub Title */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {isAm ? "የክሊኒካል መልእክቶች" : "Clinical Messaging"}
            </h1>
            <p className="text-xs text-slate-500">
              {isAm ? "ደህንነቱ የተጠበቀ የሆስፒታል መገናኛ" : "Enterprise Hospital Care Team"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Availability pill */}
            <select
              value={settings.availabilityStatus}
              onChange={(e) => void handleAvailabilityChange(e.target.value as any)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="ONLINE">🟢 {isAm ? "አክቲቭ" : "Online"}</option>
              <option value="BUSY">🟡 {isAm ? "ስራ ላይ" : "Busy"}</option>
              <option value="IN_SURGERY">🔴 {isAm ? "ቀዶ ህክምና" : "In Surgery"}</option>
              <option value="ON_CALL">🟣 {isAm ? "ጥሪ ላይ" : "On Call"}</option>
              <option value="OFFLINE">⚪ {isAm ? "ኦፍላይን" : "Offline"}</option>
            </select>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-medium dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab("conversations")}
            className={`flex-1 py-2.5 text-center transition-colors ${
              activeTab === "conversations"
                ? "border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            {isAm ? "ውይይቶች" : "Chats"} ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex-1 py-2.5 text-center transition-colors ${
              activeTab === "tasks"
                ? "border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            {isAm ? "ተግባራት" : "Tasks"} ({tasks.filter((t) => t.status === "PENDING").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`flex-1 py-2.5 text-center transition-colors ${
              activeTab === "directory"
                ? "border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            {isAm ? "ሰራተኞች" : "Directory"} ({staffList.length})
          </button>
        </div>

        {/* Search & Action bar */}
        <div className="p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={isAm ? "ፈልግ..." : "Search staff, department..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowNewChatModal(true)}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isAm ? "አዲስ" : "New"}</span>
            </button>
          </div>

          {activeTab === "conversations" && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">
                {isAm ? "አጣራ በ:" : "Filter:"}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPriorityFilter("ALL")}
                  className={`rounded px-2 py-0.5 text-[11px] ${
                    priorityFilter === "ALL"
                      ? "bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityFilter("URGENT")}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${
                    priorityFilter === "URGENT"
                      ? "bg-red-100 font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Flame className="h-3 w-3 text-red-500" />
                  Urgent Only
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Conversation List */}
        {activeTab === "conversations" && (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isAm ? "ምንም ውይይት አልተገኘም" : "No conversations found"}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConversationId;
                const isUrgent =
                  conv.lastMessage?.priority === "URGENT" ||
                  conv.lastMessage?.priority === "CRITICAL" ||
                  conv.lastMessage?.priority === "STAT";

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`flex w-full items-start gap-3 p-3 text-left transition-colors ${
                      isSelected
                        ? "bg-blue-50/70 dark:bg-blue-950/40"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {/* Type icon / avatar */}
                    <div className="relative mt-0.5 flex-shrink-0">
                      {conv.type === "DEPARTMENT" ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <Building2 className="h-5 w-5" />
                        </div>
                      ) : conv.type === "GROUP" ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          <Users className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                      {conv.unreadCount > 0 && (
                        <span
                          className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            isUrgent ? "bg-red-600 animate-pulse" : "bg-blue-600"
                          }`}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                          {conv.title || "Clinical Conversation"}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {safeFormatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {conv.department || "General"}
                        </span>
                        {conv.patient && (
                          <span className="truncate rounded bg-amber-50 px-1 py-0.2 text-[9px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            {conv.patient.firstName} {conv.patient.lastName}
                          </span>
                        )}
                      </div>

                      {conv.lastMessage && (
                        <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {isUrgent && <span className="font-bold text-red-600 mr-1">[URGENT]</span>}
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Clinical Tasks List */}
        {activeTab === "tasks" && (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 dark:divide-slate-800">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isAm ? "ምንም ተግባር አልተመደበም" : "No clinical tasks recorded"}
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-100 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-500">{task.taskNumber}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        task.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : task.status === "ACKNOWLEDGED"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">{task.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{task.description}</p>

                  <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400 dark:border-slate-800">
                    <span>Assigned: {task.assignedToName || "Department"}</span>
                    {task.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => void handleUpdateTaskStatus(task.id, "COMPLETED")}
                        className="rounded bg-emerald-600 px-2 py-0.5 text-white font-semibold hover:bg-emerald-700"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Staff Directory */}
        {activeTab === "directory" && (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {staffList.map((staff) => (
              <div key={staff.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{staff.name}</span>
                    <span className="text-[10px] text-slate-400">({staff.role})</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{staff.department}</span>
                  {staff.statusMessage && (
                    <p className="text-[10px] italic text-slate-400">{staff.statusMessage}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const conv = await clinicalMessagingService.createConversation({
                      type: "DIRECT",
                      memberIds: [staff.id],
                    });
                    setConversations((prev) => mergeUniqueConversations(prev, conv));
                    setSelectedConversationId(conv.id);
                    setActiveTab("conversations");
                  }}
                  className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                >
                  Message
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ============================================================ */}
      {/* 2. CENTER PANEL: ACTIVE CONVERSATION THREAD                 */}
      {/* ============================================================ */}
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {activeConversation ? (
          <>
            {/* Thread Header */}
            <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {activeConversation.type === "DEPARTMENT" ? (
                    <Building2 className="h-5 w-5" />
                  ) : activeConversation.type === "GROUP" ? (
                    <Users className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeConversation.title}
                    </h2>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {activeConversation.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{activeConversation.department || "Hospital Wide"}</span>
                    {activeConversation.patient && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          Patient: {activeConversation.patient.firstName} {activeConversation.patient.lastName} ({activeConversation.patient.patientNumber})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(messages[messages.length - 1] || null)}
                  disabled={messages.length === 0}
                  className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 disabled:opacity-40"
                >
                  <ListTodo className="h-3.5 w-3.5 text-blue-600" />
                  <span>{isAm ? "ወደ ተግባር ቀይር" : "Convert to Task"}</span>
                </button>
              </div>
            </header>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-400">
                  <MessageSquare className="h-8 w-8 mb-2 text-slate-300" />
                  <span>{isAm ? "ምንም መልእክት የለም። ውይይት ይጀምሩ!" : "No messages in this conversation yet. Send an instruction or update."}</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === "current-user";
                  const isUrgent = msg.priority === "URGENT" || msg.priority === "CRITICAL" || msg.priority === "STAT";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {msg.senderName} ({msg.senderRole})
                        </span>
                        <span>•</span>
                        <span>{safeFormatTime(msg.createdAt)}</span>
                        {isUrgent && (
                          <span className="rounded bg-red-100 px-1 py-0.2 text-[9px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                            {msg.priority}
                          </span>
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`relative max-w-xl rounded-2xl p-4 shadow-sm ${
                          isMine
                            ? "bg-blue-600 text-white rounded-br-none"
                            : isUrgent
                            ? "bg-red-50 text-slate-900 border border-red-200 rounded-bl-none dark:bg-red-950/40 dark:text-red-100 dark:border-red-800"
                            : "bg-white text-slate-900 border border-slate-200 rounded-bl-none dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
                        }`}
                      >
                        {/* Clinical Subject / Category */}
                        {msg.subject && (
                          <div className={`mb-1 font-semibold text-xs ${isMine ? "text-blue-100" : isUrgent ? "text-red-700 dark:text-red-300" : "text-blue-700 dark:text-blue-400"}`}>
                            [{msg.category}] {msg.subject}
                          </div>
                        )}

                        {/* Content */}
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-3 space-y-1.5 pt-2 border-t border-black/10 dark:border-white/10">
                            {msg.attachments.map((att) => (
                              <div
                                key={att.id}
                                className={`flex items-center justify-between rounded-lg p-2 text-xs ${
                                  isMine ? "bg-blue-700/60 text-white" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{att.fileName}</span>
                                  <span className="text-[10px] opacity-70">({Math.round(att.fileSize / 1024)} KB)</span>
                                </div>
                                <a
                                  href={clinicalMessagingService.getAttachmentDownloadUrl(att.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`rounded p-1 ${isMine ? "hover:bg-blue-800" : "hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Linked Clinical Task */}
                        {msg.tasks && msg.tasks.length > 0 && (
                          <div className="mt-2.5 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center justify-between font-bold">
                              <span>Task #{msg.tasks[0].taskNumber}</span>
                              <span className="rounded bg-emerald-200 px-1 text-[9px] dark:bg-emerald-900">{msg.tasks[0].status}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] truncate">{msg.tasks[0].title}</p>
                          </div>
                        )}

                        {/* Acknowledgment block */}
                        {msg.acknowledgedAt ? (
                          <div className={`mt-2 flex items-center gap-1.5 text-[11px] pt-1 border-t ${isMine ? "border-blue-500 text-blue-100" : "border-emerald-200 text-emerald-700 dark:text-emerald-400"}`}>
                            <CheckCheck className="h-3.5 w-3.5" />
                            <span>
                              {isAm ? "ተረጋግጧል በ: " : "Acknowledged by "} {msg.acknowledgedBy || "Staff Member"} at{" "}
                              {safeFormatTime(msg.acknowledgedAt)}
                            </span>
                            {msg.acknowledgmentNotes && <span className="italic">({msg.acknowledgmentNotes})</span>}
                          </div>
                        ) : isUrgent && !isMine ? (
                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
                            <button
                              type="button"
                              onClick={() => setShowAckModal(msg)}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                              {isAm ? "አረጋግጥ" : "Acknowledge Instruction"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowEscalateModal(msg)}
                              className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-slate-900 dark:text-red-300"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5 inline mr-0.5" />
                              {isAm ? "አሳውቅ/Escalate" : "Escalate to Supervisor"}
                            </button>
                          </div>
                        ) : null}

                        {/* Status footer for sender */}
                        {isMine && (
                          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-blue-200">
                            <span>{msg.status}</span>
                            {msg.status === "ACKNOWLEDGED" ? (
                              <CheckCheck className="h-3 w-3 text-emerald-300" />
                            ) : msg.status === "READ" ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <footer className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                {/* Priority Selector */}
                <select
                  value={inputPriority}
                  onChange={(e) => setInputPriority(e.target.value as MessagePriority)}
                  className={`rounded-lg border px-2 py-1 font-semibold focus:outline-none ${
                    inputPriority === "CRITICAL" || inputPriority === "STAT"
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : inputPriority === "URGENT"
                      ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                      : inputPriority === "IMPORTANT"
                      ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <option value="ROUTINE">Normal / Routine</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="URGENT">Urgent (Alert)</option>
                  <option value="STAT">STAT / Critical</option>
                </select>

                {/* Category Selector */}
                <select
                  value={inputCategory}
                  onChange={(e) => setInputCategory(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="CLINICAL_INSTRUCTION">Clinical Instruction</option>
                  <option value="MEDICATION_ORDER">Medication Instruction</option>
                  <option value="NURSING_CARE">Nursing Care Request</option>
                  <option value="VITAL_SIGNS_REQUEST">Vital Signs Check</option>
                  <option value="LABORATORY_REQUEST">Laboratory Request</option>
                  <option value="GENERAL_CONSULTATION">General Consultation</option>
                </select>

                {/* Attachment label / indicator */}
                {pendingAttachment && (
                  <div className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[150px]">{pendingAttachment.name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingAttachment(null)}
                      className="ml-1 text-blue-500 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Input row */}
              <div className="flex items-end gap-2">
                <label className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
                  />
                </label>

                <textarea
                  rows={2}
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={
                    isAm
                      ? "ክሊኒካል መልእክት ወይም መመሪያ ይፃፉ... (Enter ለመላክ)"
                      : "Type a clinical instruction or message... (Press Enter to send)"
                  }
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                />

                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={sending || (!inputContent.trim() && !pendingAttachment)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-400">
            {isAm ? "ውይይት ይምረጡ ወይም አዲስ ይጀምሩ" : "Select a conversation from the sidebar to view messages."}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* 3. MODALS: NEW CHAT, TASK CONVERSION, ACKNOWLEDGMENT, ESCALATE */}
      {/* ============================================================ */}

      {/* MODAL: New Chat / Group */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isAm ? "አዲስ ውይይት ወይም የቡድን ቻናል ጀምር" : "Start New Conversation / Care Team"}
              </h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {isAm ? "የውይይት አይነት" : "Conversation Type"}
                </label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // pick first staff
                      if (staffList[0]) {
                        void clinicalMessagingService.createConversation({ type: "DIRECT", memberIds: [staffList[0].id] }).then((c) => {
                          setConversations((p) => mergeUniqueConversations(p, c));
                          setSelectedConversationId(c.id);
                          setShowNewChatModal(false);
                        });
                      }
                    }}
                    className="rounded-lg border border-slate-200 p-2 text-center hover:bg-blue-50 dark:border-slate-700"
                  >
                    <User className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    <span>Direct Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void clinicalMessagingService.createConversation({
                        type: "DEPARTMENT",
                        department: "Emergency",
                        memberIds: staffList.slice(0, 2).map((s) => s.id),
                      }).then((c) => {
                        setConversations((p) => mergeUniqueConversations(p, c));
                        setSelectedConversationId(c.id);
                        setShowNewChatModal(false);
                      });
                    }}
                    className="rounded-lg border border-slate-200 p-2 text-center hover:bg-blue-50 dark:border-slate-700"
                  >
                    <Building2 className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                    <span>Department</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void clinicalMessagingService.createConversation({
                        type: "GROUP",
                        title: "Multidisciplinary Care Team",
                        memberIds: staffList.slice(0, 3).map((s) => s.id),
                      }).then((c) => {
                        setConversations((p) => mergeUniqueConversations(p, c));
                        setSelectedConversationId(c.id);
                        setShowNewChatModal(false);
                      });
                    }}
                    className="rounded-lg border border-slate-200 p-2 text-center hover:bg-blue-50 dark:border-slate-700"
                  >
                    <Users className="h-4 w-4 mx-auto mb-1 text-indigo-600" />
                    <span>Care Team Group</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {isAm ? "ፈጣን የሰራተኛ ውይይት ይምረጡ" : "Or Select Staff Member Directly:"}
                </label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {staffList.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={async () => {
                        const conv = await clinicalMessagingService.createConversation({
                          type: "DIRECT",
                          memberIds: [s.id],
                        });
                        setConversations((p) => mergeUniqueConversations(p, conv));
                        setSelectedConversationId(conv.id);
                        setShowNewChatModal(false);
                      }}
                      className="flex w-full items-center justify-between p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.role} • {s.department}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Acknowledge Clinical Instruction */}
      {showAckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              {isAm ? "ክሊኒካል መመሪያ ማረጋገጫ" : "Acknowledge Clinical Instruction"}
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 p-2.5 rounded-lg dark:bg-slate-800">
              &quot;{showAckModal.content || ""}&quot;
            </p>

            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isAm ? "የማረጋገጫ ማስታወሻ (አማራጭ)" : "Acknowledgment Notes / Actions Taken:"}
              </label>
              <textarea
                rows={3}
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                placeholder={isAm ? "ለምሳሌ፡ ቪታሎች ተወስደዋል፣ መድሃኒት ተሰጥቷል..." : "e.g. Vitals checked, IV titrated to ordered rate, medication administered..."}
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAckModal(null)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAcknowledge()}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700"
              >
                Confirm Acknowledgment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Escalate to Supervisor */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              {isAm ? "ወደ ኃላፊ አሳውቅ (Supervisor Escalation)" : "Escalate to Department Head / Supervisor"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Escalate this unacknowledged urgent message to the Department Head or Medical Director.
            </p>

            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isAm ? "የማሳወቂያ ምክንያት" : "Reason for Clinical Escalation:"}
              </label>
              <textarea
                rows={3}
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Unacknowledged urgent instruction exceeding safety threshold..."
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEscalateModal(null)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleEscalate()}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-700"
              >
                Dispatch Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Convert Message to Task */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-blue-600" />
              {isAm ? "የክሊኒካል ተግባር ፍጠር (Message-to-Task)" : "Convert Message to Structured Task"}
            </h3>

            <div className="mt-3 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Task Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Administer STAT IV infusion and check vitals"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Task Type</label>
                  <select
                    value={taskForm.taskType}
                    onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="NURSING_CARE">Nursing Care</option>
                    <option value="MEDICATION_ORDER">Medication Order</option>
                    <option value="VITALS_MONITORING">Vitals Monitoring</option>
                    <option value="LAB_COLLECTION">Lab Specimen Collection</option>
                    <option value="PHARMACY_DISPENSE">Pharmacy Dispense</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as MessagePriority })}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Assign To Staff</label>
                <select
                  value={taskForm.assignedToId}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Department Care Team</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role} - {s.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Due Within (Hours)</label>
                <select
                  value={taskForm.dueHours}
                  onChange={(e) => setTaskForm({ ...taskForm, dueHours: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours</option>
                  <option value="8">8 Hours (End of Shift)</option>
                  <option value="24">24 Hours</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTaskModal(null)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateTask()}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Communication Settings */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {isAm ? "የመገናኛ ምርጫዎች" : "Staff Communication Settings"}
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Audio Alerts</p>
                  <p className="text-slate-500">Play sound on new clinical message</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Email Digest</p>
                  <p className="text-slate-500">Forward unread notices to email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Minimum Notification Priority
                </label>
                <select
                  value={settings.minNotificationPriority}
                  onChange={(e) => setSettings({ ...settings, minNotificationPriority: e.target.value as MessagePriority })}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="ROUTINE">All Messages (Routine and above)</option>
                  <option value="IMPORTANT">Important and Above</option>
                  <option value="URGENT">Urgent and STAT Only</option>
                </select>
              </div>

              <div className="rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 inline mr-1 text-amber-600" />
                <strong>Mandatory Policy:</strong> Critical clinical alerts and supervisor safety escalations cannot be muted or disabled per Gondar Hospital patient safety standards.
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-700"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
