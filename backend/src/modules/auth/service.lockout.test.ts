import { describe, expect, it, beforeEach } from "vitest";
import {
  failedLoginTracker,
  cleanupLockoutTracker,
  resetLockoutTracker,
  MAX_CONSECUTIVE_FAILED_LOGINS,
  LOCKOUT_DURATION_MS,
  MAX_LOCKOUT_ENTRIES,
  ATTEMPT_WINDOW_MS,
} from "./service.js";

describe("AuthService In-Memory Brute-Force Lockout Defense", () => {
  beforeEach(() => {
    resetLockoutTracker();
  });

  describe("1. Capacity & Bounding", () => {
    it("safely enforces MAX_LOCKOUT_ENTRIES and prevents unbounded memory growth", () => {
      const now = Date.now();
      // Populate tracker with MAX_LOCKOUT_ENTRIES + 50 entries
      for (let i = 0; i < MAX_LOCKOUT_ENTRIES + 50; i++) {
        failedLoginTracker.set(`attacker_${i}@example.test`, {
          count: 1,
          lockedUntil: null,
          lastAttemptAt: now,
        });
      }

      expect(failedLoginTracker.size).toBe(MAX_LOCKOUT_ENTRIES + 50);

      // Trigger cleanup
      cleanupLockoutTracker(now);

      // Must be bounded down to MAX_LOCKOUT_ENTRIES
      expect(failedLoginTracker.size).toBeLessThanOrEqual(MAX_LOCKOUT_ENTRIES);
    });
  });

  describe("2. Expiration & Safe Cleanup", () => {
    it("cleans up expired entries that are outside ATTEMPT_WINDOW_MS", () => {
      const now = Date.now();
      const pastTime = now - (ATTEMPT_WINDOW_MS + 1000); // 16 minutes ago

      failedLoginTracker.set("old_failed@example.test", {
        count: 2,
        lockedUntil: null,
        lastAttemptAt: pastTime,
      });

      failedLoginTracker.set("recent_failed@example.test", {
        count: 2,
        lockedUntil: null,
        lastAttemptAt: now,
      });

      cleanupLockoutTracker(now);

      expect(failedLoginTracker.has("old_failed@example.test")).toBe(false);
      expect(failedLoginTracker.has("recent_failed@example.test")).toBe(true);
    });

    it("cleans up expired locked accounts once lockedUntil has elapsed", () => {
      const now = Date.now();
      const pastLockout = now - 1000; // Locked in past

      failedLoginTracker.set("unlocked_now@example.test", {
        count: 5,
        lockedUntil: pastLockout,
        lastAttemptAt: now - (ATTEMPT_WINDOW_MS + 5000),
      });

      cleanupLockoutTracker(now);

      expect(failedLoginTracker.has("unlocked_now@example.test")).toBe(false);
    });

    it("preserves active locked accounts within LOCKOUT_DURATION_MS", () => {
      const now = Date.now();
      const activeLockout = now + (10 * 60 * 1000); // 10 minutes remaining

      failedLoginTracker.set("actively_locked@example.test", {
        count: 5,
        lockedUntil: activeLockout,
        lastAttemptAt: now,
      });

      cleanupLockoutTracker(now);

      expect(failedLoginTracker.has("actively_locked@example.test")).toBe(true);
      const entry = failedLoginTracker.get("actively_locked@example.test");
      expect(entry?.lockedUntil).toBe(activeLockout);
      expect(entry?.count).toBe(MAX_CONSECUTIVE_FAILED_LOGINS);
    });
  });

  describe("3. Restart Behavior Verification", () => {
    it("demonstrates reset on backend process restart and documents Redis recommendation", () => {
      // Simulate active state
      failedLoginTracker.set("user_before_restart@example.test", {
        count: 5,
        lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
        lastAttemptAt: Date.now(),
      });
      expect(failedLoginTracker.size).toBe(1);

      // Simulate process restart
      resetLockoutTracker();
      expect(failedLoginTracker.size).toBe(0);
      expect(failedLoginTracker.has("user_before_restart@example.test")).toBe(false);
    });
  });
});
