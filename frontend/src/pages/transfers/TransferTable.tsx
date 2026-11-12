import type { ReactNode } from "react";
import type { Transfer } from "../../api/types";
import { TransferStatusBadge } from "../../components/StatusBadge";
import { Table, td, th } from "../../components/ui/Layout";
import { formatDate, formatMoney } from "../../lib/format";

export function TransferTable({ items, onOpen, showRequester = true, actions }: {
  items: Transfer[]; onOpen: (t: Transfer) => void; showRequester?: boolean; actions?: (t: Transfer) => ReactNode;
}) {
  const dateCol = actions ? "hidden 2xl:table-cell" : "hidden sm:table-cell";
  return (
    <Table head={<>
      <th className={th}>Request</th>
      {showRequester && <th className={`${th} hidden md:table-cell`}>Requested by</th>}
      <th className={`${th} ${dateCol}`}>Date</th>
      <th className={`${th} text-right`}>Amount</th>
      <th className={th}>Status</th>
      {actions && <th className={`${th} text-right`}><span className="sr-only">Actions</span></th>}
    </>}>
      {items.map((t) => (
        <tr key={t.id} onClick={() => onOpen(t)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
          <td className={td}>
            <div className="max-w-[16rem] truncate">{t.description || "—"}</div>
            <div className="text-xs text-slate-500">#{t.id}</div>
          </td>
          {showRequester && <td className={`${td} hidden text-slate-600 md:table-cell dark:text-slate-300`}><div className="max-w-[13rem] truncate">{t.requestedByEmail}</div></td>}
          <td className={`${td} ${dateCol} whitespace-nowrap text-slate-500`}>{formatDate(t.createdAt, false)}</td>
          <td className={`${td} text-right font-medium whitespace-nowrap tabular-nums`}>{formatMoney(t.amount, t.currency)}</td>
          <td className={td}><TransferStatusBadge status={t.status} /></td>
          {actions && <td className={`${td} text-right whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>{actions(t)}</td>}
        </tr>
      ))}
    </Table>
  );
}
