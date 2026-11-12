import { useAuth } from "../auth/AuthContext";
import { Badge, PermissionChip } from "../components/ui/Badge";
import { Avatar, Card, PageHeader } from "../components/ui/Layout";
import { groupDuties } from "../lib/access";
import { humanize } from "../lib/format";

export function ProfilePage() {
  const { me } = useAuth();
  if (!me) return null;
  const groups = groupDuties(me.duties);
  return (
    <div className="space-y-5">
      <PageHeader title="Profile" />
      <Card>
        <div className="flex items-center gap-3">
          <Avatar email={me.email} size="lg" />
          <div className="min-w-0">
            <div className="truncate font-medium">{me.email}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{me.tenantType === "PLATFORM" ? "Platform administration" : me.tenantSlug}</div>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-slate-500">Roles</dt>
          <dd className="flex flex-wrap gap-1.5">{me.roles.length ? me.roles.map((r) => <Badge key={r} tone="brand">{humanize(r)}</Badge>) : "—"}</dd>
        </dl>
      </Card>

      <Card title="Permissions" padded={false}>
        {groups.size === 0 && me.platformDuties.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No permissions assigned.</p>
        ) : (
          <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-700/60">
            {[...groups.entries()].map(([resource, actions]) => (
              <div key={resource} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[8rem_1fr]">
                <dt className="font-medium">{humanize(resource)}</dt>
                <dd className="flex flex-wrap gap-1">{actions.map((a) => <Badge key={a}>{a}</Badge>)}</dd>
              </div>
            ))}
            {me.platformDuties.length > 0 && (
              <div className="grid gap-2 px-4 py-2.5 sm:grid-cols-[8rem_1fr]">
                <dt className="font-medium">Platform</dt>
                <dd className="flex flex-wrap gap-1">{me.platformDuties.map((d) => <PermissionChip key={d} code={d} />)}</dd>
              </div>
            )}
          </dl>
        )}
      </Card>
    </div>
  );
}
