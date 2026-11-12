import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "../lib/toast";
import { ApiError } from "../api/client";
import { authApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "../components/layout/AppShell";
import { Button, IconButton } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Field";
import { fieldErrors } from "../lib/errors";

type Mode = "login" | "first-password";
type Demo = { password: string; firstLoginTemporaryPassword: string; personas: { email: string; title: string; org: string; firstLogin?: boolean }[] };

function PasswordInput({ id, value, onChange, error, autoComplete }: { id: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <Input
      id={id}
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      error={error}
      required
      trailing={<IconButton label={show ? "Hide password" : "Show password"} className="size-7" onClick={() => setShow((s) => !s)}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</IconButton>}
    />
  );
}

export function LoginPage() {
  const { login, notice, clearNotice } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [demo, setDemo] = useState<Demo | null>(null);

  // Demo accounts are only bundled when VITE_DEMO_MODE=true; otherwise this import is removed from the build.
  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "true") void import("../demo/demo-accounts.json").then((m) => setDemo(m.default as Demo));
  }, []);

  async function doLogin(e: string, p: string) {
    setBusy(true);
    setError(null);
    setFields({});
    clearNotice();
    try {
      await login(e, p);
    } catch (err) {
      if (err instanceof ApiError && err.passwordChangeRequired) {
        setMode("first-password");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Incorrect email or password.");
      } else {
        setError(err instanceof Error ? err.message : "Sign-in failed.");
        setFields(fieldErrors(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitFirstPassword(ev: FormEvent) {
    ev.preventDefault();
    if (newPassword !== confirm) {
      setFields({ confirm: "Passwords do not match." });
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await authApi.firstPassword(email, password, newPassword);
      toast.success("Password updated.");
      setMode("login");
      setPassword(newPassword);
      await doLogin(email, newPassword);
    } catch (err) {
      setFields(fieldErrors(err));
      setError(err instanceof ApiError && err.status === 401 ? "The temporary password is incorrect or has expired." : err instanceof Error ? err.message : "Failed.");
      setBusy(false);
    }
  }

  function pickDemo(value: string) {
    const p = demo?.personas.find((x) => x.email === value);
    if (!p || !demo) return;
    setEmail(p.email);
    setPassword(p.firstLogin ? demo.firstLoginTemporaryPassword : demo.password);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Set a new password"}</h1>
          {mode === "first-password" && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Replace your temporary password to continue.</p>}

          {notice && mode === "login" && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">{notice}</p>}
          {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}

          {mode === "login" ? (
            <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); void doLogin(email, password); }}>
              <Field label="Email" error={fields.email}>
                {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" error={fields.email} required autoFocus />}
              </Field>
              <Field label="Password" error={fields.password}>
                {(id) => <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="current-password" error={fields.password} />}
              </Field>
              <Button type="submit" className="w-full" loading={busy}>Sign in</Button>
            </form>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={submitFirstPassword}>
              <Field label="Temporary password" error={fields.temporaryPassword}>
                {(id) => <PasswordInput id={id} value={password} onChange={setPassword} autoComplete="current-password" error={fields.temporaryPassword} />}
              </Field>
              <Field label="New password" hint="12 to 72 characters." error={fields.newPassword}>
                {(id) => <PasswordInput id={id} value={newPassword} onChange={setNewPassword} autoComplete="new-password" error={fields.newPassword} />}
              </Field>
              <Field label="Confirm new password" error={fields.confirm}>
                {(id) => <PasswordInput id={id} value={confirm} onChange={setConfirm} autoComplete="new-password" error={fields.confirm} />}
              </Field>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setMode("login"); setError(null); }}>Back</Button>
                <Button type="submit" className="flex-1" loading={busy}>Save and sign in</Button>
              </div>
            </form>
          )}
        </div>

        {demo && mode === "login" && (
          <div className="mt-4">
            <Select aria-label="Demo account" defaultValue="" onChange={(e) => pickDemo(e.target.value)}>
              <option value="" disabled>Demo account…</option>
              {demo.personas.map((p) => <option key={p.email} value={p.email}>{p.title} · {p.org}</option>)}
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
