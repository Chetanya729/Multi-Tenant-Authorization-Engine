import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Search, UserPlus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "../../lib/toast";
import { roleApi, userApi } from "../../api/endpoints";
import type { DisableReason, Role, User } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { Badge, PermissionChip } from "../../components/ui/Badge";
import { Button, IconButton } from "../../components/ui/Button";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "../../components/ui/Field";
import { Card, PageHeader, Pagination, Table, td, th } from "../../components/ui/Layout";
import { Drawer, Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, SkeletonRows, Spinner } from "../../components/ui/States";
import { explain, fieldErrors } from "../../lib/errors";
import { formatDate, generatePassword, humanize } from "../../lib/format";

function UserStatus({ user }: { user: User }) {
  if (!user.enabled) return <Badge tone="red">Disabled</Badge>;
  if (user.temporaryPassword) {
    const expired = user.tempPassExpiryAt && new Date(user.tempPassExpiryAt).getTime() < Date.now();
    return <Badge tone={expired ? "red" : "amber"}>{expired ? "Invite expired" : "Invited"}</Badge>;
  }
  return <Badge tone="green">Active</Badge>;
}

export function UsersPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const users = useQuery({ queryKey: ["users", page], queryFn: () => userApi.list({ page, size: 20 }), placeholderData: keepPreviousData });
  const roles = useQuery({ queryKey: ["roles"], queryFn: roleApi.list, enabled: can("role:read") });

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = users.data?.items ?? [];
    return q ? all.filter((u) => u.email.includes(q) || u.roles.some((r) => r.toLowerCase().includes(q))) : all;
  }, [users.data, search]);
  const open = users.data?.items.find((u) => u.userId === openId) ?? null;

  return (
    <>
      <PageHeader title="Users" actions={can("user:create") && <Button icon={<UserPlus className="size-4" />} onClick={() => setCreating(true)}>Add user</Button>} />
      <Card padded={false}>
        <div className="border-b border-slate-200 p-3 dark:border-slate-700">
          <div className="sm:w-64"><Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} leading={<Search className="size-4" />} /></div>
        </div>
        {users.isPending ? <SkeletonRows /> : users.isError ? <ErrorState error={users.error} onRetry={() => void users.refetch()} /> : items.length === 0 ? (
          <EmptyState title="No users found." />
        ) : (
          <Table head={<><th className={th}>Email</th><th className={`${th} hidden md:table-cell`}>Roles</th><th className={th}>Status</th><th className={`${th} hidden lg:table-cell`}>Added</th></>}>
            {items.map((u) => (
              <tr key={u.userId} onClick={() => setOpenId(u.userId)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <td className={td}><div className="max-w-[14rem] truncate sm:max-w-none">{u.email}</div></td>
                <td className={`${td} hidden text-slate-600 md:table-cell dark:text-slate-300`}>{u.roles.map(humanize).join(", ") || "—"}</td>
                <td className={td}><UserStatus user={u} /></td>
                <td className={`${td} hidden whitespace-nowrap text-slate-500 lg:table-cell`}>{formatDate(u.createdAt, false)}</td>
              </tr>
            ))}
          </Table>
        )}
        {users.data && <Pagination page={page} totalPages={users.data.totalPages} totalElements={users.data.totalElements} onChange={setPage} />}
      </Card>

      <CreateUserModal open={creating} onClose={() => setCreating(false)} roles={roles.data ?? []} />
      <UserDrawer user={open} onClose={() => setOpenId(null)} roles={roles.data ?? []} />
    </>
  );
}

function CreateUserModal({ open, onClose, roles }: { open: boolean; onClose: () => void; roles: Role[] }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const create = useMutation({
    mutationFn: () => userApi.create({ email: email.trim(), temporaryPassword: password, roleIds }),
    onSuccess: (u) => {
      setCreated({ email: u.email, password });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(explain(e, "assign")),
  });
  const errors = fieldErrors(create.error);
  const close = () => {
    onClose();
    setTimeout(() => { setCreated(null); setEmail(""); setRoleIds([]); setPassword(generatePassword()); create.reset(); }, 150);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };

  if (created) {
    return (
      <Modal open={open} onClose={close} title="User added" description="Share the temporary password securely. It expires in 24 hours." footer={<Button onClick={close}>Done</Button>}>
        <dl className="space-y-3 text-sm">
          {[["Email", created.email], ["Temporary password", created.password]].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="truncate font-mono">{value}</dd></div>
              <IconButton label={`Copy ${label}`} onClick={() => { void navigator.clipboard.writeText(value!); toast.success("Copied."); }}><Copy className="size-4" /></IconButton>
            </div>
          ))}
        </dl>
      </Modal>
    );
  }

  const active = roles.filter((r) => r.active);
  return (
    <Modal open={open} onClose={close} title="Add user"
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" form="create-user" loading={create.isPending}>Add user</Button></>}>
      <form id="create-user" className="space-y-4" onSubmit={submit}>
        <Field label="Email" error={errors.email}>
          {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />}
        </Field>
        <Field label="Temporary password" error={errors.temporaryPassword}
          action={<button type="button" className="text-xs text-brand-600 hover:underline dark:text-brand-300" onClick={() => setPassword(generatePassword())}>Generate</button>}>
          {(id) => <Input id={id} value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" error={errors.temporaryPassword} required minLength={12} maxLength={72} />}
        </Field>
        {can("role:assign") && active.length > 0 && (
          <div>
            <div className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Roles</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {active.map((r) => (
                <Checkbox key={r.roleId} label={humanize(r.name)} checked={roleIds.includes(r.roleId)}
                  onChange={(on) => setRoleIds((ids) => (on ? [...ids, r.roleId] : ids.filter((x) => x !== r.roleId)))} />
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

function UserDrawer({ user, onClose, roles }: { user: User | null; onClose: () => void; roles: Role[] }) {
  const { can, me } = useAuth();
  const queryClient = useQueryClient();
  const [disabling, setDisabling] = useState(false);
  const access = useQuery({ queryKey: ["users", "access", user?.userId], queryFn: () => userApi.access(user!.userId), enabled: !!user });

  const toggle = useMutation({
    mutationFn: ({ role, on }: { role: Role; on: boolean }) => (on ? userApi.assignRole(user!.userId, role.roleId) : userApi.revokeRole(user!.userId, role.roleId)),
    onSuccess: (data, { role, on }) => {
      queryClient.setQueryData(["users", "access", user!.userId], data);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(on ? `${humanize(role.name)} assigned.` : `${humanize(role.name)} removed.`);
    },
    onError: (e) => toast.error(explain(e, "assign")),
  });
  const enable = useMutation({
    mutationFn: () => userApi.enable(user!.userId),
    onSuccess: () => { toast.success("User enabled."); void queryClient.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e) => toast.error(explain(e, "status")),
  });

  if (!user) return null;
  const self = user.userId === me?.userId;
  const held = new Set(access.data?.roles ?? []);
  const canStatus = can("user:disable") && !self;

  return (
    <Drawer open={!!user} onClose={onClose} title={user.email} description={`Added ${formatDate(user.createdAt, false)}`}
      footer={canStatus ? (user.enabled
        ? <Button variant="secondary" className="text-red-600 dark:text-red-400" onClick={() => setDisabling(true)}>Disable user</Button>
        : <Button variant="secondary" loading={enable.isPending} onClick={() => enable.mutate()}>Enable user</Button>) : undefined}>
      <div className="mb-5"><UserStatus user={user} /></div>

      <h3 className="mb-2 text-sm font-semibold">Roles</h3>
      {access.isPending ? <Spinner /> : can("role:read") && roles.length ? (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {roles.filter((r) => r.active || held.has(r.name)).map((r) => {
            const on = held.has(r.name);
            const allowed = on ? can("role:revoke") : can("role:assign");
            return (
              <li key={r.roleId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>{humanize(r.name)}</span>
                <Switch label={`${on ? "Remove" : "Assign"} ${r.name}`} checked={on} disabled={!allowed || toggle.isPending} onChange={(next) => toggle.mutate({ role: r, on: next })} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm">{[...held].map(humanize).join(", ") || "—"}</p>
      )}

      <h3 className="mt-6 mb-2 text-sm font-semibold">Permissions</h3>
      {access.data && access.data.duties.length === 0 ? <p className="text-sm text-slate-500">None</p> : (
        <div className="flex flex-wrap gap-1">{(access.data?.duties ?? []).map((d) => <PermissionChip key={d} code={d} />)}</div>
      )}

      <DisableModal key={String(disabling)} user={disabling ? user : null} onClose={() => setDisabling(false)} />
    </Drawer>
  );
}

function DisableModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<DisableReason>("RESIGNED");
  const [note, setNote] = useState("");
  const disable = useMutation({
    mutationFn: () => userApi.disable(user!.userId, reason, note.trim()),
    onSuccess: () => {
      toast.success("User disabled.");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (e) => toast.error(explain(e, "status")),
  });
  if (!user) return null;
  return (
    <Modal open={!!user} onClose={onClose} size="sm" title="Disable user" description="The user is signed out immediately."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={disable.isPending} onClick={() => disable.mutate()}>Disable</Button></>}>
      <div className="space-y-4">
        <Field label="Reason">
          {(id) => (
            <Select id={id} value={reason} onChange={(e) => setReason(e.target.value as DisableReason)}>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="OTHER">Other</option>
            </Select>
          )}
        </Field>
        <Field label="Note (optional)">{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />}</Field>
      </div>
    </Modal>
  );
}
