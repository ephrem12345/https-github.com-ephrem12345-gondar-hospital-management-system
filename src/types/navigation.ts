import type { LucideIcon } from "lucide-react";

export interface NavItem {
  /** Stable identifier, also used as the dictionary fallback. */
  id: string;
  label: string;
  labelAm: string;
  href: string;
  icon: LucideIcon;
  /** Short description shown on placeholder module pages. */
  description: string;
}

export interface NavGroup {
  id: string;
  label: string;
  labelAm: string;
  icon: LucideIcon;
  items: NavItem[];
}
