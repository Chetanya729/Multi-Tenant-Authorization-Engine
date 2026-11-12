export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
}

export type TenantType = "PLATFORM" | "ORGANISATION";
export type TenantStatus = "ACTIVE" | "SUSPENDED";
export type TransferStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DisableReason = "RESIGNED" | "TERMINATED" | "ON_LEAVE" | "OTHER";

export interface Me {
  userId: number;
  email: string;
  tenantId: number;
  tenantType: TenantType;
  tenantSlug: string;
  duties: string[];
  platformDuties: string[];
  roles: string[];
}

export interface User {
  userId: number;
  email: string;
  tenantId: number;
  enabled: boolean;
  temporaryPassword: boolean;
  tempPassExpiryAt: string | null;
  roles: string[];
  createdAt: string;
}

export interface UserAccess {
  userId: number;
  email: string;
  roles: string[];
  duties: string[];
  platformDuties: string[];
}

export interface UserStatus {
  userId: number;
  email: string;
  enabled: boolean;
}

export interface Role {
  roleId: number;
  name: string;
  description: string | null;
  system: boolean;
  active: boolean;
  tenantId: number;
  duties: string[];
  createdAt: string;
  approvalLimit: number | null;
}

export interface Duty {
  permissionId: number;
  code: string;
  description: string | null;
  scope: "PLATFORM" | "TENANT";
  active: boolean;
  system: boolean;
  tenantId: number;
}

export interface Transfer {
  id: number;
  amount: number;
  currency: string;
  description: string | null;
  status: TransferStatus;
  requestedById: number;
  requestedByEmail: string;
  decidedById: number | null;
  decidedByEmail: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  targetType: string | null;
  targetId: string | null;
  actorId: number | null;
  actorEmail: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface TenantSummary {
  tenantId: number;
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  userCount: number;
  createdAt: string;
}

export interface TenantCreated {
  tenantId: number;
  name: string;
  slug: string;
  adminUserId: number;
  adminEmail: string;
}

export interface TenantStatusResult {
  id: number;
  slug: string;
  tenantStatus: TenantStatus;
}
