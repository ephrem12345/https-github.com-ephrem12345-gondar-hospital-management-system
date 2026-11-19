import { describe, it, expect } from "vitest";
import {
  deduplicateConversations,
  type Conversation,
} from "./clinical-messaging";

const DUPLICATE_ID = "90433d2a-a45f-42ff-a4d6-c5d1e8349d0d";

describe("Clinical Messaging Deduplication and Duplicate Key Prevention", () => {
  it("deduplicates arrays containing the exact repeated conversation ID", () => {
    const rawConversations: Conversation[] = [
      {
        id: DUPLICATE_ID,
        type: "DIRECT",
        title: "Dr. Selam Girma",
        department: "Internal Medicine",
        patient: null,
        members: [{ userId: "u1", name: "Dr. Selam", role: "DOCTOR", conversationRole: "OWNER", availability: "ONLINE", statusMessage: null }],
        lastMessage: {
          id: "m1",
          content: "Initial morning update",
          category: "CLINICAL_INSTRUCTION",
          priority: "ROUTINE",
          createdAt: "2026-11-17T08:00:00.000Z",
          sender: { id: "u1", firstName: "Selam", lastName: "Girma", role: "DOCTOR" },
        },
        unreadCount: 0,
        updatedAt: "2026-11-17T08:00:00.000Z",
      },
      {
        id: "other-conv-123",
        type: "DEPARTMENT",
        title: "Emergency Care Channel",
        department: "Emergency",
        patient: null,
        members: [],
        lastMessage: null,
        unreadCount: 2,
        updatedAt: "2026-11-17T08:10:00.000Z",
      },
      {
        id: DUPLICATE_ID, // Duplicate from join or repeated effect
        type: "DIRECT",
        title: "Dr. Selam Girma (Updated)",
        department: "Internal Medicine",
        patient: null,
        members: [
          { userId: "u1", name: "Dr. Selam", role: "DOCTOR", conversationRole: "OWNER", availability: "ONLINE", statusMessage: null },
          { userId: "u2", name: "Sr. Tigist", role: "NURSE", conversationRole: "MEMBER", availability: "ONLINE", statusMessage: null },
        ],
        lastMessage: {
          id: "m2",
          content: "STAT alert: Vitals check required",
          category: "CLINICAL_INSTRUCTION",
          priority: "URGENT",
          createdAt: "2026-11-17T08:30:00.000Z",
          sender: { id: "u2", firstName: "Tigist", lastName: "Alemu", role: "NURSE" },
        },
        unreadCount: 1,
        updatedAt: "2026-11-17T08:30:00.000Z",
      },
    ];

    const result = deduplicateConversations(rawConversations);

    // Exactly 2 unique items
    expect(result).toHaveLength(2);

    const ids = result.map((c) => c.id);
    expect(ids).toEqual([DUPLICATE_ID, "other-conv-123"]);

    // Verify it preserved the newest and most complete record
    const dedupedTarget = result.find((c) => c.id === DUPLICATE_ID);
    expect(dedupedTarget).toBeDefined();
    expect(dedupedTarget?.lastMessage?.content).toBe("STAT alert: Vitals check required");
    expect(dedupedTarget?.members).toHaveLength(2);
    expect(dedupedTarget?.unreadCount).toBe(1);
  });

  it("safely handles empty, null, or malformed conversation inputs", () => {
    expect(deduplicateConversations([])).toEqual([]);
    expect(deduplicateConversations(null as any)).toEqual([]);
    expect(deduplicateConversations([null as any, undefined as any])).toEqual([]);
  });

  it("preserves conversation array order and stability under repeated invocations (React Strict Mode)", () => {
    const list: Conversation[] = [
      {
        id: "c-1",
        type: "DIRECT",
        title: "Chat 1",
        department: "OPD",
        patient: null,
        members: [],
        lastMessage: null,
        unreadCount: 0,
        updatedAt: "2026-11-17T09:00:00.000Z",
      },
      {
        id: "c-2",
        type: "DIRECT",
        title: "Chat 2",
        department: "Ward",
        patient: null,
        members: [],
        lastMessage: null,
        unreadCount: 0,
        updatedAt: "2026-11-17T08:00:00.000Z",
      },
    ];

    // Simulating mount 1
    const run1 = deduplicateConversations(list);
    // Simulating mount 2 (React Strict Mode re-run)
    const run2 = deduplicateConversations([...run1, ...list]);

    expect(run2).toHaveLength(2);
    expect(run2.map((c) => c.id)).toEqual(["c-1", "c-2"]);
  });
});
