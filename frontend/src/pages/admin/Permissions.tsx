import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "../../lib/toast";
import { dutyApi } from "../../api/endpoints";
import type { Duty } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field, Input, Switch, Textarea } from "../../components/ui/Field";
import { Card, PageHeader, Table, td, th } from "../../components/ui/Layout";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, ErrorState, SkeletonRows } from "../../components/ui/States";
import { explain, fieldErrors } from "../../lib/errors";

export function PermissionsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const duties = useQuery({ queryKey: ["duties"], queryFn: dutyApi.list });

  const toggle = useMutation({
    mutationFn: (d: Duty) => (d.active ? dutyApi.deactivate(d.permissionId) : dutyApi.activate(d.permissionId)),
    onSuccess: (d) => {
      void queryClient.invalidateQueries({ queryKey: ["duties"] });
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(`${d.code} ${d.active ? "activated" : "deactivated"}.`);
    },
    onError: (e) => toast.error(explain(e)),
  });

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (duties.data ?? [])
      .filter((d) => !q || d.code.includes(q) || (d.description ?? "").toLowerCase().includes(q))
      .sort((a, b) => Number(a.system) - Number(b.system) || a.code.localeCompare(b.code));
  }, [duties.data, search]);

  return (
    <>
      <PageHeader title="Permissions" actions={can("permission:create") && <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>New permission</Button>} />
      <Card padded={false}>
        <div className="border-b border-slate-200 p-3 dark:border-slate-700">
          <div className="sm:w-64"><Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} leading={<Search className="size-4" />} /></div>
        </div>
        {duties.isPending ? <SkeletonRows /> : duties.isError ? <ErrorState error={duties.error} onRetry={() => void duties.refetch()} /> : items.length === 0 ? (
          <EmptyState title="No permissions found." />
        ) : (
          <Table head={<><th className={th}>Code</th><th className={`${th} hidden md:table-cell`}>Description</th><th className={`${th} text-right`}>Active</th></>}>
            {items.map((d) => (
              <tr key={d.permissionId}>
                <td className={td}>
                  <span className={`font-mono text-xs ${d.active ? "" : "text-slate-400 line-through"}`}>{d.code}</span>
                  {d.system && <Badge className="ml-2">System</Badge>}
                </td>
                <td className={`${td} hidden text-slate-500 md:table-cell`}>{d.description || "—"}</td>
                <td className={`${td} text-right`}>
                  <Switch label={`${d.active ? "Deactivate" : "Activate"} ${d.code}`} checked={d.active} disabled={!can("permission:deactivate") || d.system || toggle.isPending} onChange={() => toggle.mutate(d)} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <CreatePermissionModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CreatePermissionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const valid = /^[a-z]+(-[a-z]+)*:[a-z]+(-[a-z]+)*$/.test(code);
  const reserved = /^(tenant|platform):/.test(code);
  const create = useMutation({
    mutationFn: () => dutyApi.create({ code, description: description.trim() || undefined }),
    onSuccess: () => {
      toast.success("Permission created.");
      void queryClient.invalidateQueries({ queryKey: ["duties"] });
      setCode("");
      setDescription("");
      onClose();
    },
    onError: (e) => toast.error(explain(e)),
  });
  const errors = fieldErrors(create.error);
  const codeError = errors.code ?? (reserved ? "This prefix is reserved." : code && !valid ? "Use the format resource:action." : undefined);
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };
  return (
    <Modal open={open} onClose={onClose} title="New permission"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="create-permission" disabled={!valid || reserved} loading={create.isPending}>Create</Button></>}>
      <form id="create-permission" className="space-y-4" onSubmit={submit}>
        <Field label="Code" hint="Format resource:action, e.g. invoice:approve." error={codeError}>
          {(id) => <Input id={id} value={code} onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s/g, ""))} className="font-mono" required maxLength={100} />}
        </Field>
        <Field label="Description" error={errors.description}>
          {(id) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />}
        </Field>
      </form>
    </Modal>
  );
}
