import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "../../lib/toast";
import { transferApi } from "../../api/endpoints";
import type { Transfer } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { TransferStatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Drawer, Modal } from "../../components/ui/Modal";
import { explain, fieldErrors } from "../../lib/errors";
import { formatDate, formatMoney } from "../../lib/format";

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

export function NewTransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [description, setDescription] = useState("");
  const create = useMutation({
    mutationFn: () => transferApi.create({ amount: Number(amount), currency, description: description.trim() || undefined }),
    onSuccess: (t) => {
      toast.success(`Request #${t.id} submitted.`);
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setAmount("");
      setDescription("");
      onClose();
    },
    onError: (e) => toast.error(explain(e)),
  });
  const errors = fieldErrors(create.error);
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };

  return (
    <Modal open={open} onClose={onClose} title="New transfer request"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="new-transfer" loading={create.isPending}>Submit</Button></>}>
      <form id="new-transfer" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[1fr_6.5rem] gap-3">
          <Field label="Amount" error={errors.amount}>
            {(id) => <Input id={id} type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} required />}
          </Field>
          <Field label="Currency" error={errors.currency}>
            {(id) => <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>}
          </Field>
        </div>
        <Field label="Description" error={errors.description}>
          {(id) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />}
        </Field>
      </form>
    </Modal>
  );
}

export function DecisionModal({ transfer, decision, onClose }: { transfer: Transfer | null; decision: "approve" | "reject"; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () => (decision === "approve" ? transferApi.approve(transfer!.id, note.trim() || undefined) : transferApi.reject(transfer!.id, note.trim())),
    onSuccess: (t) => {
      toast.success(decision === "approve" ? `Request #${t.id} approved.` : `Request #${t.id} rejected.`);
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      void queryClient.invalidateQueries({ queryKey: ["audit"] });
      setNote("");
      onClose();
    },
    onError: (e) => {
      toast.error(explain(e, decision));
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
  if (!transfer) return null;
  const approve = decision === "approve";
  return (
    <Modal open={!!transfer} onClose={onClose} size="sm" title={approve ? "Approve request" : "Reject request"}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={approve ? "primary" : "danger"} loading={mutation.isPending} disabled={!approve && !note.trim()} onClick={() => mutation.mutate()}>{approve ? "Approve" : "Reject"}</Button>
      </>}>
      <div className="mb-4 flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">#{transfer.id} · {transfer.description || "No description"}</span>
        <span className="font-semibold tabular-nums">{formatMoney(transfer.amount, transfer.currency)}</span>
      </div>
      <Field label={approve ? "Note (optional)" : "Reason"}>
        {(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} data-autofocus />}
      </Field>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function TransferDrawer({ transfer, onClose, onDecide }: { transfer: Transfer | null; onClose: () => void; onDecide?: (t: Transfer, d: "approve" | "reject") => void }) {
  const { me, can } = useAuth();
  if (!transfer) return null;
  const own = transfer.requestedById === me?.userId;
  const decidable = transfer.status === "PENDING" && can("transfer:approve") && !own && onDecide;
  return (
    <Drawer open={!!transfer} onClose={onClose} title={`Request #${transfer.id}`}
      footer={decidable ? (
        <>
          <Button variant="secondary" className="flex-1" onClick={() => onDecide!(transfer, "reject")}>Reject</Button>
          <Button className="flex-1" onClick={() => onDecide!(transfer, "approve")}>Approve</Button>
        </>
      ) : undefined}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-2xl font-semibold tabular-nums">{formatMoney(transfer.amount, transfer.currency)}</span>
        <TransferStatusBadge status={transfer.status} />
      </div>
      <dl className="divide-y divide-slate-100 dark:divide-slate-700/60">
        <Row label="Description">{transfer.description || "—"}</Row>
        <Row label="Requested by">{transfer.requestedByEmail}{own && " (you)"}</Row>
        <Row label="Submitted">{formatDate(transfer.createdAt)}</Row>
        {transfer.status !== "PENDING" && (
          <>
            <Row label={transfer.status === "APPROVED" ? "Approved by" : "Rejected by"}>{transfer.decidedByEmail}</Row>
            <Row label="Decided">{formatDate(transfer.decidedAt)}</Row>
            <Row label="Note">{transfer.decisionNote || "—"}</Row>
          </>
        )}
      </dl>
      {own && transfer.status === "PENDING" && <p className="mt-4 text-xs text-slate-500">Your own request must be decided by another approver.</p>}
    </Drawer>
  );
}

/** Excel treats cells starting with = + - @ as formulas, so user-entered text is prefixed to stop CSV injection. */
function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Transfer[]) {
  const header = ["id", "amount", "currency", "status", "description", "requestedBy", "decidedBy", "decidedAt", "decisionNote", "createdAt"];
  const lines = rows.map((t) => [t.id, t.amount, t.currency, t.status, t.description, t.requestedByEmail, t.decidedByEmail, t.decidedAt, t.decisionNote, t.createdAt].map(csvCell).join(","));
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transfers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
