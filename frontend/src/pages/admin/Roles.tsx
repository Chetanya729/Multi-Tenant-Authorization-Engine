import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "../../lib/toast";
import { dutyApi, roleApi } from "../../api/endpoints";
import type { Duty, Role } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field, Input, Switch, Textarea } from "../../components/ui/Field";
import { Card, PageHeader, Table, td, th } from "../../components/ui/Layout";
import { Drawer, Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from "../../components/ui/States";
import { explain, fieldErrors } from "../../lib/errors";
import { humanize } from "../../lib/format";

export function RolesPage() {
  const { can } = useAuth();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const roles = useQuery({ queryKey: ["roles"], queryFn: roleApi.list });
  const open = roles.data?.find((r) => r.roleId === openId) ?? null;

  return (
    <>
      <PageHeader title="Roles" actions={can("role:create") && <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>New role</Button>} />
      <Card padded={false}>
        {roles.isPending ? <SkeletonRows /> : roles.isError ? <ErrorState error={roles.error} onRetry={() => void roles.refetch()} /> : roles.data.length === 0 ? (
          <EmptyState title="No roles yet." />
        ) : (
          <Table head={<><th className={th}>Role</th><th className={`${th} hidden md:table-cell`}>Description</th><th className={`${th} text-right`}>Permissions</th><th className={`${th} text-right`}>Approval limit</th></>}>
            {roles.data.map((r) => (
              <tr key={r.roleId} onClick={() => setOpenId(r.roleId)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <td className={td}>
                  <span className="font-medium">{humanize(r.name)}</span>
                  {r.system && <Badge className="ml-2">System</Badge>}
                  {!r.active && <Badge tone="red" className="ml-2">Inactive</Badge>}
                </td>
                <td className={`${td} hidden max-w-xs truncate text-slate-500 md:table-cell`}>{r.description || "—"}</td>
                <td className={`${td} text-right tabular-nums`}>{r.duties.length}</td>
                <td className={`${td} text-right tabular-nums`}>{r.approvalLimit != null ? r.approvalLimit.toLocaleString() : "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <CreateRoleModal open={creating} onClose={() => setCreating(false)} />
      <RoleDrawer role={open} onClose={() => setOpenId(null)} />
    </>
  );
}

function CreateRoleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useMutation({
    mutationFn: () => roleApi.create({ name, description: description.trim() || undefined }),
    onSuccess: () => {
      toast.success("Role created.");
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      setName("");
      setDescription("");
      onClose();
    },
    onError: (e) => toast.error(explain(e)),
  });
  const errors = fieldErrors(create.error);
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };
  return (
    <Modal open={open} onClose={onClose} title="New role"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="create-role" loading={create.isPending}>Create</Button></>}>
      <form id="create-role" className="space-y-4" onSubmit={submit}>
        <Field label="Name" hint="Capital letters, digits and underscores, e.g. TREASURY_ANALYST." error={errors.name}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))} className="font-mono" error={errors.name} required maxLength={100} />}
        </Field>
        <Field label="Description" error={errors.description}>
          {(id) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />}
        </Field>
      </form>
    </Modal>
  );
}

function RoleDrawer({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const duties = useQuery({ queryKey: ["duties"], queryFn: dutyApi.list, enabled: !!role && can("permission:read") });
  const [limit, setLimit] = useState<string | null>(null);
  const replaceRole = (updated: Role) => queryClient.setQueryData<Role[]>(["roles"], (old) => old?.map((r) => (r.roleId === updated.roleId ? updated : r)));

  const toggle = useMutation({
    mutationFn: ({ duty, on }: { duty: Duty; on: boolean }) => (on ? roleApi.grantDuty(role!.roleId, duty.permissionId) : roleApi.revokeDuty(role!.roleId, duty.permissionId)),
    onSuccess: (updated, { duty, on }) => {
      replaceRole(updated);
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(`${duty.code} ${on ? "added" : "removed"}.`);
    },
    onError: (e) => toast.error(explain(e, "assign")),
  });
  const saveLimit = useMutation({
    mutationFn: (value: number | null) => roleApi.setApprovalLimit(role!.roleId, value),
    onSuccess: (r) => {
      replaceRole(r);
      setLimit(null);
      toast.success("Approval limit saved.");
    },
    onError: (e) => toast.error(explain(e, "limit")),
  });

  if (!role) return null;
  const held = new Set(role.duties);
  const list = (duties.data ?? []).filter((d) => d.scope === "TENANT").sort((a, b) => Number(a.system) - Number(b.system) || a.code.localeCompare(b.code));

  return (
    <Drawer open={!!role} onClose={() => { setLimit(null); onClose(); }} title={humanize(role.name)} description={role.system ? "System role · read only" : role.description ?? undefined}>
      {!role.system && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold">Approval limit</h3>
          <div className="flex gap-2">
            <Input type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="None" disabled={!can("role:update")}
              value={limit ?? (role.approvalLimit?.toString() ?? "")} onChange={(e) => setLimit(e.target.value)} />
            <Button variant="secondary" disabled={!can("role:update") || limit === null} loading={saveLimit.isPending}
              onClick={() => saveLimit.mutate(limit === "" || limit === null ? null : Number(limit))}>Save</Button>
          </div>
        </section>
      )}

      <h3 className="mb-2 text-sm font-semibold">Permissions</h3>
      {!can("permission:read") ? (
        <p className="text-sm">{role.duties.join(", ") || "—"}</p>
      ) : duties.isPending ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {list.map((d) => {
            const on = held.has(d.code);
            const allowed = !role.system && d.active && (on ? can("permission:revoke") : can("permission:assign"));
            return (
              <li key={d.permissionId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className={`font-mono text-xs ${d.active ? "" : "text-slate-400 line-through"}`}>{d.code}</span>
                <Switch label={`${on ? "Remove" : "Add"} ${d.code}`} checked={on} disabled={!allowed || toggle.isPending} onChange={(next) => toggle.mutate({ duty: d, on: next })} />
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
