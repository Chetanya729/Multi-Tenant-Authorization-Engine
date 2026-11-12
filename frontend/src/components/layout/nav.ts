import { ArrowLeftRight, Building2, CheckSquare, FileClock, KeyRound, LayoutDashboard, Lock, Send, Users, type LucideIcon } from "lucide-react";
import type { Me } from "../../api/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  section: "Main" | "Transfers" | "Administration" | "Platform";
  visible: (me: Me) => boolean;
}

const has = (me: Me, d: string) => me.duties.includes(d);

export const NAV: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, section: "Main", visible: () => true },
  { to: "/transfers/mine", label: "My requests", icon: Send, section: "Transfers", visible: (me) => has(me, "transfer:create") },
  { to: "/transfers/approvals", label: "Approvals", icon: CheckSquare, section: "Transfers", visible: (me) => has(me, "transfer:approve") && has(me, "transfer:read") },
  { to: "/transfers", label: "All transfers", icon: ArrowLeftRight, section: "Transfers", visible: (me) => has(me, "transfer:read") },
  { to: "/users", label: "Users", icon: Users, section: "Administration", visible: (me) => has(me, "user:read") },
  { to: "/roles", label: "Roles", icon: KeyRound, section: "Administration", visible: (me) => has(me, "role:read") },
  { to: "/permissions", label: "Permissions", icon: Lock, section: "Administration", visible: (me) => has(me, "permission:read") },
  { to: "/audit", label: "Audit log", icon: FileClock, section: "Administration", visible: (me) => has(me, "audit:read") },
  { to: "/organisations", label: "Organisations", icon: Building2, section: "Platform", visible: (me) => me.platformDuties.includes("tenant:read") },
];
