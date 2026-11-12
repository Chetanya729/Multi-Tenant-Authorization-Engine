import clsx from "clsx";
import { LogOut, Menu, Moon, Sun, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { APP_NAME } from "../../lib/brand";
import { IconButton } from "../ui/Button";
import { Avatar } from "../ui/Layout";
import { NAV } from "./nav";

export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <IconButton label={dark ? "Light theme" : "Dark theme"} onClick={toggle}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </IconButton>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" className="size-7 rounded-md" />
      <span className="text-sm font-bold tracking-[0.16em]">{APP_NAME}</span>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { me } = useAuth();
  if (!me) return null;
  const items = NAV.filter((item) => item.visible(me));
  const sections = [...new Set(items.map((i) => i.section))];
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
      {sections.map((section) => (
        <div key={section}>
          {section !== "Main" && <div className="mb-1 px-2.5 text-[11px] font-medium text-slate-400 uppercase">{section}</div>}
          <ul className="space-y-0.5">
            {items.filter((i) => i.section === section).map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/" || item.to === "/transfers"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      "focus-ring flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm",
                      isActive
                        ? "bg-brand-50 font-medium text-brand-700 dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60",
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard({ onNavigate }: { onNavigate?: () => void }) {
  const { me, logout } = useAuth();
  if (!me) return null;
  return (
    <div className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
      <Link to="/profile" onClick={onNavigate} className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-700/60" title="Profile">
        <Avatar email={me.email} />
        <span className="min-w-0 truncate text-sm">{me.email}</span>
      </Link>
      <IconButton label="Sign out" onClick={() => void logout()}><LogOut className="size-4" /></IconButton>
    </div>
  );
}

export function AppShell() {
  const { me } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname]);
  const orgLabel = me?.tenantType === "PLATFORM" ? "Platform administration" : me?.tenantSlug;

  return (
    <div className="min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-14 items-center border-b border-slate-200 px-5 dark:border-slate-700"><Logo /></div>
        <Sidebar />
        <UserCard />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col bg-white shadow-xl dark:bg-slate-800">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700">
              <Logo />
              <IconButton label="Close menu" onClick={() => setMobileOpen(false)}><X className="size-4" /></IconButton>
            </div>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <UserCard onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-700 dark:bg-slate-800">
        <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></IconButton>
        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{orgLabel}</span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link to="/profile" aria-label="Profile" title="Profile" className="focus-ring inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-700"><UserRound className="size-4" /></Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
