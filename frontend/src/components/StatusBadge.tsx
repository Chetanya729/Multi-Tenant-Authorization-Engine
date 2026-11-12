import type { TransferStatus } from "../api/types";
import { Badge, type Tone } from "./ui/Badge";

const config: Record<TransferStatus, { tone: Tone; label: string }> = {
  PENDING: { tone: "amber", label: "Pending" },
  APPROVED: { tone: "green", label: "Approved" },
  REJECTED: { tone: "red", label: "Rejected" },
};

export function TransferStatusBadge({ status }: { status: TransferStatus }) {
  return <Badge tone={config[status].tone}>{config[status].label}</Badge>;
}

export function auditTone(action: string): Tone {
  if (/DISABLED|SUSPENDED|REVOKED|REJECTED|DEACTIVATED/.test(action)) return "red";
  if (/APPROVED|ENABLED|REACTIVATED|ACTIVATED/.test(action)) return "green";
  if (/TRANSFER/.test(action)) return "amber";
  return "slate";
}
