import type { ModuleScreen } from "@/modules/types";

export const billingScreens: Record<string, ModuleScreen> = {
  "/chapa-checkout": { kind: "custom", screen: "chapa-checkout" },
  "/subscription": { kind: "custom", screen: "subscription" },
  "/media-library": { kind: "custom", screen: "media-library" },
  "/platform-admin": { kind: "custom", screen: "platform-admin" },
};
