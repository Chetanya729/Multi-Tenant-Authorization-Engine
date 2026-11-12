import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { transferApi } from "../../api/endpoints";
import type { Transfer, TransferStatus } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { Card, PageHeader, Pagination, Segmented } from "../../components/ui/Layout";
import { EmptyState, ErrorState, SkeletonRows } from "../../components/ui/States";
import { DecisionModal, toCsv, TransferDrawer } from "./shared";
import { TransferTable } from "./TransferTable";

type Filter = "ALL" | TransferStatus;
const FILTERS: Filter[] = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export function AllTransfersPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("status") as Filter | null;
  const [filter, setFilter] = useState<Filter>(initial && FILTERS.includes(initial) ? initial : "ALL");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Transfer | null>(null);
  const [deciding, setDeciding] = useState<{ t: Transfer; d: "approve" | "reject" } | null>(null);

  const query = useQuery({
    queryKey: ["transfers", "list", filter, page],
    queryFn: () => transferApi.list({ status: filter === "ALL" ? undefined : filter, page, size: 20 }),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = query.data?.items ?? [];
    return q ? all.filter((t) => `${t.id} ${t.description ?? ""} ${t.requestedByEmail}`.toLowerCase().includes(q)) : all;
  }, [query.data, search]);

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setPage(0);
    setParams(f === "ALL" ? {} : { status: f }, { replace: true });
  };

  return (
    <>
      <PageHeader title="All transfers" actions={<Button variant="secondary" icon={<Download className="size-4" />} disabled={!items.length} onClick={() => toCsv(items)}>Export CSV</Button>} />
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <Segmented<Filter> value={filter} onChange={changeFilter} options={[
            { value: "ALL", label: "All" }, { value: "PENDING", label: "Pending" }, { value: "APPROVED", label: "Approved" }, { value: "REJECTED", label: "Rejected" },
          ]} />
          <div className="sm:w-64"><Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} leading={<Search className="size-4" />} /></div>
        </div>
        {query.isPending ? <SkeletonRows /> : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : items.length === 0 ? (
          <EmptyState title="No transfers found." />
        ) : (
          <TransferTable items={items} onOpen={setOpen} />
        )}
        {query.data && <Pagination page={page} totalPages={query.data.totalPages} totalElements={query.data.totalElements} onChange={setPage} />}
      </Card>
      <TransferDrawer transfer={open} onClose={() => setOpen(null)} onDecide={(t, d) => { setOpen(null); setDeciding({ t, d }); }} />
      <DecisionModal key={deciding ? `${deciding.t.id}-${deciding.d}` : "none"} transfer={deciding?.t ?? null} decision={deciding?.d ?? "approve"} onClose={() => setDeciding(null)} />
    </>
  );
}
