import { lazy, Suspense, type ReactNode } from "react";
import { Link, Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { NAV } from "./components/layout/nav";
import { Card } from "./components/ui/Layout";
import { EmptyState, Spinner } from "./components/ui/States";
import { LoginPage } from "./pages/Login";

// Screens load on first visit, so the sign-in page stays small and the charts library loads only with the overview.
const OverviewPage = lazy(() => import("./pages/Overview").then((m) => ({ default: m.OverviewPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage })));
const MyTransfersPage = lazy(() => import("./pages/transfers/MyTransfers").then((m) => ({ default: m.MyTransfersPage })));
const ApprovalsPage = lazy(() => import("./pages/transfers/Approvals").then((m) => ({ default: m.ApprovalsPage })));
const AllTransfersPage = lazy(() => import("./pages/transfers/AllTransfers").then((m) => ({ default: m.AllTransfersPage })));
const UsersPage = lazy(() => import("./pages/admin/Users").then((m) => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import("./pages/admin/Roles").then((m) => ({ default: m.RolesPage })));
const PermissionsPage = lazy(() => import("./pages/admin/Permissions").then((m) => ({ default: m.PermissionsPage })));
const AuditPage = lazy(() => import("./pages/admin/Audit").then((m) => ({ default: m.AuditPage })));
const OrganisationsPage = lazy(() => import("./pages/admin/Organisations").then((m) => ({ default: m.OrganisationsPage })));

const back = <Link to="/" className="focus-ring inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Go to overview</Link>;

/** Hides a page the user has no permission for. The backend enforces the same rule; this only avoids a broken page. */
function Guard({ path, children }: { path?: string; children: ReactNode }) {
  const { me } = useAuth();
  const item = path ? NAV.find((n) => n.to === path) : undefined;
  if (me && item && !item.visible(me)) {
    return <Card><EmptyState title="You don't have access to this page." action={back} /></Card>;
  }
  return <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>{children}</Suspense>;
}

function Protected() {
  const { session, me, meLoading } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (meLoading || !me) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;
  return <AppShell />;
}

export function App() {
  const { session } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<Protected />}>
        <Route index element={<Guard path="/"><OverviewPage /></Guard>} />
        <Route path="profile" element={<Guard><ProfilePage /></Guard>} />
        <Route path="transfers/mine" element={<Guard path="/transfers/mine"><MyTransfersPage /></Guard>} />
        <Route path="transfers/approvals" element={<Guard path="/transfers/approvals"><ApprovalsPage /></Guard>} />
        <Route path="transfers" element={<Guard path="/transfers"><AllTransfersPage /></Guard>} />
        <Route path="users" element={<Guard path="/users"><UsersPage /></Guard>} />
        <Route path="roles" element={<Guard path="/roles"><RolesPage /></Guard>} />
        <Route path="permissions" element={<Guard path="/permissions"><PermissionsPage /></Guard>} />
        <Route path="audit" element={<Guard path="/audit"><AuditPage /></Guard>} />
        <Route path="organisations" element={<Guard path="/organisations"><OrganisationsPage /></Guard>} />
        <Route path="*" element={<Card><EmptyState title="Page not found." action={back} /></Card>} />
      </Route>
    </Routes>
  );
}
