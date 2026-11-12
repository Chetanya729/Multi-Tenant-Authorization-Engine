import { api } from "./client";
import type {
  AuditEntry, DisableReason, Duty, Me, Page, Role, TenantCreated, TenantStatusResult, TenantSummary,
  TokenResponse, Transfer, TransferStatus, User, UserAccess, UserStatus,
} from "./types";

type Paging = { page?: number; size?: number };

export const authApi = {
  login: (email: string, password: string) =>
    api<TokenResponse>("/api/auth/login", { method: "POST", body: { email, password }, auth: false }),
  firstPassword: (email: string, temporaryPassword: string, newPassword: string) =>
    api<void>("/api/auth/first-password", { method: "POST", body: { email, temporaryPassword, newPassword }, auth: false }),
  logout: (refreshToken: string) => api<void>("/api/auth/logout", { method: "POST", body: { refreshToken } }),
  me: () => api<Me>("/api/me"),
};

export const transferApi = {
  mine: (p: Paging = {}) => api<Page<Transfer>>("/api/transfers/mine", { query: { page: p.page ?? 0, size: p.size ?? 20 } }),
  list: (p: Paging & { status?: TransferStatus } = {}) =>
    api<Page<Transfer>>("/api/transfers/list", { query: { page: p.page ?? 0, size: p.size ?? 20, status: p.status } }),
  get: (id: number) => api<Transfer>(`/api/transfers/${id}`),
  create: (body: { amount: number; currency: string; description?: string }) =>
    api<Transfer>("/api/transfers/create", { method: "POST", body }),
  approve: (id: number, note?: string) =>
    api<Transfer>(`/api/transfers/${id}/approve`, { method: "POST", body: note ? { note } : undefined }),
  reject: (id: number, note: string) => api<Transfer>(`/api/transfers/${id}/reject`, { method: "POST", body: { note } }),
};

export const userApi = {
  list: (p: Paging = {}) => api<Page<User>>("/api/users/list", { query: { page: p.page ?? 0, size: p.size ?? 20 } }),
  create: (body: { email: string; temporaryPassword: string; roleIds: number[] }) =>
    api<User>("/api/users/create", { method: "POST", body }),
  access: (id: number) => api<UserAccess>(`/api/users/${id}/permissions`),
  assignRole: (userId: number, roleId: number) => api<UserAccess>(`/api/users/${userId}/roles/${roleId}`, { method: "PUT" }),
  revokeRole: (userId: number, roleId: number) => api<UserAccess>(`/api/users/${userId}/roles/${roleId}`, { method: "DELETE" }),
  disable: (id: number, reason: DisableReason, note?: string) =>
    api<UserStatus>(`/api/users/${id}/disable`, { method: "POST", body: { reason, note: note || undefined } }),
  enable: (id: number) => api<UserStatus>(`/api/users/${id}/enable`, { method: "POST" }),
};

export const roleApi = {
  list: () => api<Role[]>("/api/roles/list"),
  create: (body: { name: string; description?: string }) => api<Role>("/api/roles/create", { method: "POST", body }),
  grantDuty: (roleId: number, permissionId: number) =>
    api<Role>(`/api/roles/${roleId}/permissions/${permissionId}`, { method: "PUT" }),
  revokeDuty: (roleId: number, permissionId: number) =>
    api<Role>(`/api/roles/${roleId}/permissions/${permissionId}`, { method: "DELETE" }),
  setApprovalLimit: (roleId: number, approvalLimit: number | null) =>
    api<Role>(`/api/roles/${roleId}/approval-limit`, { method: "PUT", body: { approvalLimit } }),
};

export const dutyApi = {
  list: () => api<Duty[]>("/api/permissions"),
  create: (body: { code: string; description?: string }) => api<Duty>("/api/permissions/create", { method: "POST", body }),
  deactivate: (id: number) => api<Duty>(`/api/permissions/${id}/deactivate`, { method: "POST" }),
  activate: (id: number) => api<Duty>(`/api/permissions/${id}/activate`, { method: "POST" }),
};

export const auditApi = {
  list: (p: Paging = {}) => api<Page<AuditEntry>>("/api/audit-logs/list", { query: { page: p.page ?? 0, size: p.size ?? 20 } }),
};

export const tenantApi = {
  list: (p: Paging = {}) => api<Page<TenantSummary>>("/api/tenants/list", { query: { page: p.page ?? 0, size: p.size ?? 20 } }),
  create: (body: { name: string; slug: string; adminEmail: string; temporaryPassword: string }) =>
    api<TenantCreated>("/api/tenants/create", { method: "POST", body }),
  suspend: (id: number) => api<TenantStatusResult>(`/api/tenants/${id}/suspend`, { method: "POST" }),
  reactivate: (id: number) => api<TenantStatusResult>(`/api/tenants/${id}/reactivate`, { method: "POST" }),
};
