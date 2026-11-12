import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { auditApi } from "../../api/endpoints";
import { auditTone } from "../../components/StatusBadge";
import { Badge } from "../../components/ui/Badge";
import { Card, PageHeader, Pagination, Table, td, th } from "../../components/ui/Layout";
import { EmptyState, ErrorState, SkeletonRows } from "../../components/ui/States";
import { formatDate, humanize } from "../../lib/format";

export function AuditPage() {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["audit", page],
    queryFn: () => auditApi.list({ page, size: 25 }),
    placeholderData: keepPreviousData,
    refetchInterval: page === 0 ? 15_000 : false,
  });

  return (
    <>
      <PageHeader title="Audit log" />
      <Card padded={false}>
        {query.isPending ? <SkeletonRows rows={8} /> : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : query.data.items.length === 0 ? (
          <EmptyState title="No events yet." />
        ) : (
          <Table head={<><th className={th}>Time</th><th className={th}>Action</th><th className={`${th} hidden md:table-cell`}>User</th><th className={`${th} hidden sm:table-cell`}>Target</th></>}>
            {query.data.items.map((e) => {
              const details = Object.entries(e.details ?? {});
              const isOpen = expanded === e.id;
              return (
                <Fragment key={e.id}>
                  <tr onClick={() => setExpanded(isOpen ? null : e.id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className={`${td} whitespace-nowrap text-slate-500`}>{formatDate(e.createdAt)}</td>
                    <td className={td}><Badge tone={auditTone(e.action)}>{humanize(e.action)}</Badge></td>
                    <td className={`${td} hidden text-slate-600 md:table-cell dark:text-slate-300`}>{e.actorEmail ?? "System"}</td>
                    <td className={`${td} hidden text-slate-500 sm:table-cell`}>{e.targetType ? `${humanize(e.targetType)} #${e.targetId}` : "—"}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50 dark:bg-slate-900/40">
                      <td colSpan={4} className="px-4 py-3">
                        <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                          <div className="flex gap-2 md:hidden"><dt className="text-slate-500">user</dt><dd>{e.actorEmail ?? "System"}</dd></div>
                          {details.length === 0 && <span className="text-slate-500">No details</span>}
                          {details.map(([k, v]) => (
                            <div key={k} className="flex min-w-0 gap-2">
                              <dt className="shrink-0 text-slate-500">{k}</dt>
                              <dd className="truncate font-mono">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
                            </div>
                          ))}
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </Table>
        )}
        {query.data && <Pagination page={page} totalPages={query.data.totalPages} totalElements={query.data.totalElements} onChange={setPage} />}
      </Card>
    </>
  );
}
