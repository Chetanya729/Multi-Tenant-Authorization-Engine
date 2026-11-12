import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { transferApi } from "../../api/endpoints";
import type { Transfer } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card, PageHeader, Pagination } from "../../components/ui/Layout";
import { EmptyState, ErrorState, SkeletonRows } from "../../components/ui/States";
import { NewTransferModal, TransferDrawer } from "./shared";
import { TransferTable } from "./TransferTable";

export function MyTransfersPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<Transfer | null>(null);
  const query = useQuery({ queryKey: ["transfers", "mine", page], queryFn: () => transferApi.mine({ page, size: 20 }), placeholderData: keepPreviousData, refetchInterval: 30_000 });

  return (
    <>
      <PageHeader title="My requests" actions={can("transfer:create") && <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>New request</Button>} />
      <Card padded={false}>
        {query.isPending ? <SkeletonRows /> : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : query.data.items.length === 0 ? (
          <EmptyState title="No requests yet." />
        ) : (
          <>
            <TransferTable items={query.data.items} onOpen={setOpen} showRequester={false} />
            <Pagination page={page} totalPages={query.data.totalPages} totalElements={query.data.totalElements} onChange={setPage} />
          </>
        )}
      </Card>
      <NewTransferModal open={creating} onClose={() => setCreating(false)} />
      <TransferDrawer transfer={open} onClose={() => setOpen(null)} />
    </>
  );
}
