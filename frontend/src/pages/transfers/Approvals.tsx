import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { transferApi } from "../../api/endpoints";
import type { Transfer } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card, PageHeader, Pagination } from "../../components/ui/Layout";
import { EmptyState, ErrorState, SkeletonRows } from "../../components/ui/States";
import { DecisionModal, TransferDrawer } from "./shared";
import { TransferTable } from "./TransferTable";

export function ApprovalsPage() {
  const { me } = useAuth();
  const [page, setPage] = useState(0);
  const [deciding, setDeciding] = useState<{ t: Transfer; d: "approve" | "reject" } | null>(null);
  const [open, setOpen] = useState<Transfer | null>(null);
  const query = useQuery({
    queryKey: ["transfers", "list", "PENDING", page],
    queryFn: () => transferApi.list({ status: "PENDING", page, size: 20 }),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
  const decide = (t: Transfer, d: "approve" | "reject") => { setOpen(null); setDeciding({ t, d }); };

  return (
    <>
      <PageHeader title="Approvals" />
      <Card padded={false}>
        {query.isPending ? <SkeletonRows /> : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : query.data.items.length === 0 ? (
          <EmptyState title="No pending requests." />
        ) : (
          <>
            <TransferTable
              items={query.data.items}
              onOpen={setOpen}
              actions={(t) => t.requestedById === me?.userId ? (
                <span className="text-xs text-slate-400">Your request</span>
              ) : (
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => decide(t, "reject")}>Reject</Button>
                  <Button size="sm" onClick={() => decide(t, "approve")}>Approve</Button>
                </div>
              )}
            />
            <Pagination page={page} totalPages={query.data.totalPages} totalElements={query.data.totalElements} onChange={setPage} />
          </>
        )}
      </Card>
      <TransferDrawer transfer={open} onClose={() => setOpen(null)} onDecide={decide} />
      <DecisionModal key={deciding ? `${deciding.t.id}-${deciding.d}` : "none"} transfer={deciding?.t ?? null} decision={deciding?.d ?? "approve"} onClose={() => setDeciding(null)} />
    </>
  );
}
