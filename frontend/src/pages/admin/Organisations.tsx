import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "../../lib/toast";
import { tenantApi } from "../../api/endpoints";
import type { TenantSummary } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { Button, IconButton } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Card, PageHeader, Pagination, Table, td, th } from "../../components/ui/Layout";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, SkeletonRows } from "../../components/ui/States";
import { explain, fieldErrors } from "../../lib/errors";
import { formatDate, generatePassword, slugify } from "../../lib/format";

export function OrganisationsPage() {
  const { canPlatform } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<TenantSummary | null>(null);
  const orgs = useQuery({ queryKey: ["tenants", page], queryFn: () => tenantApi.list({ page, size: 20 }), placeholderData: keepPreviousData });

  const toggle = useMutation({
    mutationFn: (t: TenantSummary) => (t.status === "ACTIVE" ? tenantApi.suspend(t.tenantId) : tenantApi.reactivate(t.tenantId)),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(r.tenantStatus === "SUSPENDED" ? "Organisation suspended." : "Organisation reactivated.");
      setConfirm(null);
    },
    onError: (e) => toast.error(explain(e)),
  });

  return (
    <>
      <PageHeader title="Organisations" actions={canPlatform("tenant:create") && <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>New organisation</Button>} />
      <Card padded={false}>
        {orgs.isPending ? <SkeletonRows /> : orgs.isError ? <ErrorState error={orgs.error} onRetry={() => void orgs.refetch()} /> : orgs.data.items.length === 0 ? (
          <EmptyState title="No organisations yet." />
        ) : (
          <Table head={<><th className={th}>Name</th><th className={`${th} hidden sm:table-cell`}>Status</th><th className={`${th} hidden text-right sm:table-cell`}>Users</th><th className={`${th} hidden md:table-cell`}>Created</th><th className={th}><span className="sr-only">Actions</span></th></>}>
            {orgs.data.items.map((t) => (
              <tr key={t.tenantId}>
                <td className={td}>
                  <div className="font-medium">{t.name}</div>
                  <div className="font-mono text-xs text-slate-500">{t.slug}</div>
                  <div className="mt-1 sm:hidden"><Badge tone={t.status === "ACTIVE" ? "green" : "red"}>{t.status === "ACTIVE" ? "Active" : "Suspended"}</Badge></div>
                </td>
                <td className={`${td} hidden sm:table-cell`}><Badge tone={t.status === "ACTIVE" ? "green" : "red"}>{t.status === "ACTIVE" ? "Active" : "Suspended"}</Badge></td>
                <td className={`${td} hidden text-right tabular-nums sm:table-cell`}>{t.userCount}</td>
                <td className={`${td} hidden whitespace-nowrap text-slate-500 md:table-cell`}>{formatDate(t.createdAt, false)}</td>
                <td className={`${td} text-right`}>
                  {t.type !== "PLATFORM" && canPlatform("tenant:suspend") && (
                    <Button size="sm" variant="secondary" onClick={() => (t.status === "ACTIVE" ? setConfirm(t) : toggle.mutate(t))}
                      loading={toggle.isPending && toggle.variables?.tenantId === t.tenantId}>
                      {t.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {orgs.data && <Pagination page={page} totalPages={orgs.data.totalPages} totalElements={orgs.data.totalElements} onChange={setPage} />}
      </Card>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} size="sm" title={`Suspend ${confirm?.name}?`} description="All its users are signed out immediately."
        footer={<><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" loading={toggle.isPending} onClick={() => confirm && toggle.mutate(confirm)}>Suspend</Button></>} />
      <CreateOrganisationModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CreateOrganisationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const create = useMutation({
    mutationFn: () => tenantApi.create({ name: name.trim(), slug, adminEmail: adminEmail.trim(), temporaryPassword: password }),
    onSuccess: (t) => {
      setCreated({ email: t.adminEmail, password });
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (e) => toast.error(explain(e)),
  });
  const errors = fieldErrors(create.error);
  const close = () => {
    onClose();
    setTimeout(() => { setCreated(null); setName(""); setSlug(""); setSlugTouched(false); setAdminEmail(""); setPassword(generatePassword()); create.reset(); }, 150);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };

  if (created) {
    return (
      <Modal open={open} onClose={close} title="Organisation created" description="Share the administrator's temporary password securely." footer={<Button onClick={close}>Done</Button>}>
        <dl className="space-y-3 text-sm">
          {[["Administrator", created.email], ["Temporary password", created.password]].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="truncate font-mono">{value}</dd></div>
              <IconButton label={`Copy ${label}`} onClick={() => { void navigator.clipboard.writeText(value!); toast.success("Copied."); }}><Copy className="size-4" /></IconButton>
            </div>
          ))}
        </dl>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} title="New organisation"
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" form="create-org" loading={create.isPending}>Create</Button></>}>
      <form id="create-org" className="space-y-4" onSubmit={submit}>
        <Field label="Name" error={errors.name}>
          {(id) => <Input id={id} value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} error={errors.name} required maxLength={150} />}
        </Field>
        <Field label="Short ID" hint="Lowercase letters, digits and dashes." error={errors.slug}>
          {(id) => <Input id={id} value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} className="font-mono" error={errors.slug} required maxLength={50} />}
        </Field>
        <Field label="Administrator email" error={errors.adminEmail}>
          {(id) => <Input id={id} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} error={errors.adminEmail} required />}
        </Field>
        <Field label="Temporary password" error={errors.temporaryPassword}
          action={<button type="button" className="text-xs text-brand-600 hover:underline dark:text-brand-300" onClick={() => setPassword(generatePassword())}>Generate</button>}>
          {(id) => <Input id={id} value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" error={errors.temporaryPassword} required minLength={12} maxLength={72} />}
        </Field>
      </form>
    </Modal>
  );
}
