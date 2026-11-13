import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { auditApi, tenantApi, transferApi, userApi } from "../api/endpoints";
import type { Transfer } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { NAV } from "../components/layout/nav";
import { auditTone } from "../components/StatusBadge";
import { Badge } from "../components/ui/Badge";
import { Card, PageHeader, StatCard } from "../components/ui/Layout";
import { EmptyState, Skeleton } from "../components/ui/States";
import { formatMoney, humanize, nameFromEmail, timeAgo } from "../lib/format";

function useStatusCount(status: "PENDING" | "APPROVED" | "REJECTED", enabled: boolean) {
  return useQuery({
    queryKey: ["transfers", "count", status],
    queryFn: () => transferApi.list({ status, size: 1 }),
    enabled,
    select: (p) => p.totalElements,
  });
}

/** Amounts in different currencies can't be added up, so totals and the chart use the most common currency only. */
function mainCurrency(items: Transfer[]) {
  const counts = new Map<string, number>();
  for (const t of items) counts.set(t.currency, (counts.get(t.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "INR";
}

function dailyApproved(items: Transfer[]) {
  const days: { day: string; key: string; amount: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), day: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), amount: 0 });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const t of items) {
    if (t.status !== "APPROVED") continue;
    const bucket = byKey.get(new Date(t.decidedAt ?? t.createdAt).toDateString());
    if (bucket) bucket.amount += t.amount;
  }
  return days;
}

const show = (n: number | undefined, loading: boolean) => (loading ? <Skeleton className="mt-1 h-6 w-10" /> : n ?? "—");

export function OverviewPage() {
  const { me, can, canPlatform } = useAuth();
  const navigate = useNavigate();
  const readAll = can("transfer:read");
  const approver = can("transfer:approve") && readAll;
  const submits = can("transfer:create");
  const readUsers = can("user:read");
  const readAudit = can("audit:read");
  const readOrgs = canPlatform("tenant:read");

  const pending = useStatusCount("PENDING", readAll);
  const approved = useStatusCount("APPROVED", readAll);
  const rejected = useStatusCount("REJECTED", readAll);
  const recent = useQuery({ queryKey: ["transfers", "list", "recent"], queryFn: () => transferApi.list({ size: 100 }), enabled: readAll });
  const mine = useQuery({ queryKey: ["transfers", "mine", "recent"], queryFn: () => transferApi.mine({ size: 100 }), enabled: submits && !readAll });
  const queue = useQuery({ queryKey: ["transfers", "list", "PENDING", 0], queryFn: () => transferApi.list({ status: "PENDING", size: 5 }), enabled: approver });
  const users = useQuery({ queryKey: ["users", "overview"], queryFn: () => userApi.list({ size: 100 }), enabled: readUsers });
  const audit = useQuery({ queryKey: ["audit", "recent"], queryFn: () => auditApi.list({ size: 6 }), enabled: readAudit, refetchInterval: 15_000 });
  const orgs = useQuery({ queryKey: ["tenants", "overview"], queryFn: () => tenantApi.list({ size: 100 }), enabled: readOrgs });

  const source = (readAll ? recent.data?.items : mine.data?.items) ?? [];
  const currency = mainCurrency(source);
  const sameCurrency = useMemo(() => source.filter((t) => t.currency === currency), [source, currency]);
  const series = useMemo(() => dailyApproved(sameCurrency), [sameCurrency]);
  const approvedTotal = sameCurrency.filter((t) => t.status === "APPROVED").reduce((s, t) => s + t.amount, 0);
  const mineCount = (s: string) => (mine.data?.items ?? []).filter((t) => t.status === s).length;
  const userItems = users.data?.items ?? [];

  // Pages this user can open besides Overview. A new user often has none: no role yet, or a role with no permissions.
  const otherPages = me ? NAV.filter((item) => item.to !== "/" && item.visible(me)) : [];
  const hasOverviewContent = readAll || submits || readUsers || readAudit || readOrgs;

  if (otherPages.length === 0) {
    const roles = me?.roles ?? [];
    return (
      <div className="space-y-5">
        <PageHeader title="Overview" />
        <Card>
          <EmptyState
            title="You don't have access to anything yet"
            description={
              <>
                {roles.length
                  ? `Your role${roles.length > 1 ? "s" : ""} (${roles.map(humanize).join(", ")}) ${roles.length > 1 ? "don't" : "doesn't"} include any permissions yet.`
                  : "No role has been assigned to your account yet."}{" "}
                Ask your administrator for access. This page updates automatically once it is granted.
              </>
            }
          />
        </Card>
      </div>
    );
  }

  if (!hasOverviewContent) {
    return (
      <div className="space-y-5">
        <PageHeader title="Overview" />
        <Card title="Your pages" padded={false}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {otherPages.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <item.icon className="size-4 text-slate-400" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Overview" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {readAll && (
          <>
            <StatCard label="Pending" value={show(pending.data, pending.isPending)} onClick={() => navigate(approver ? "/transfers/approvals" : "/transfers?status=PENDING")} />
            <StatCard label="Approved" value={show(approved.data, approved.isPending)} onClick={() => navigate("/transfers?status=APPROVED")} />
            <StatCard label="Rejected" value={show(rejected.data, rejected.isPending)} onClick={() => navigate("/transfers?status=REJECTED")} />
            <StatCard label={`Approved value (${currency})`} value={recent.isPending ? <Skeleton className="mt-1 h-6 w-20" /> : formatMoney(approvedTotal, currency, true)} />
          </>
        )}
        {!readAll && submits && (
          <>
            <StatCard label="My pending" value={show(mineCount("PENDING"), mine.isPending)} onClick={() => navigate("/transfers/mine")} />
            <StatCard label="My approved" value={show(mineCount("APPROVED"), mine.isPending)} onClick={() => navigate("/transfers/mine")} />
            <StatCard label="My rejected" value={show(mineCount("REJECTED"), mine.isPending)} onClick={() => navigate("/transfers/mine")} />
          </>
        )}
        {readUsers && (
          <>
            <StatCard label="Users" value={show(users.data?.totalElements, users.isPending)} onClick={() => navigate("/users")} />
            <StatCard label="Awaiting first sign-in" value={show(userItems.filter((u) => u.enabled && u.temporaryPassword).length, users.isPending)} onClick={() => navigate("/users")} />
          </>
        )}
        {readOrgs && (
          <>
            <StatCard label="Organisations" value={show(orgs.data?.totalElements, orgs.isPending)} onClick={() => navigate("/organisations")} />
            <StatCard label="Suspended" value={show(orgs.data?.items.filter((t) => t.status === "SUSPENDED").length, orgs.isPending)} onClick={() => navigate("/organisations")} />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {(readAll || submits) && (
          <Card className="lg:col-span-2" title={`Approved per day (${currency})`}>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ left: 0, right: 4, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={52} tickFormatter={(v: number) => formatMoney(v, currency, true)} />
                  <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v) => [formatMoney(Number(v), currency), "Approved"]} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {approver && (
          <Card title="Awaiting decision" padded={false} action={<Link to="/transfers/approvals" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">View all</Link>}>
            {queue.data?.items.length ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {queue.data.items.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">{t.description || `Transfer #${t.id}`}</div>
                      <div className="text-xs text-slate-500">{nameFromEmail(t.requestedByEmail)} · {timeAgo(t.createdAt)}</div>
                    </div>
                    <span className="font-medium tabular-nums">{formatMoney(t.amount, t.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing pending." />
            )}
          </Card>
        )}

        {readAudit && (
          <Card className={approver ? "lg:col-span-3" : ""} title="Recent activity" padded={false} action={<Link to="/audit" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">View all</Link>}>
            {audit.data?.items.length ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {audit.data.items.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <Badge tone={auditTone(a.action)}>{humanize(a.action)}</Badge>
                    <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{a.actorEmail ?? "System"}</span>
                    <span className="text-xs whitespace-nowrap text-slate-500">{timeAgo(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No activity yet." />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
