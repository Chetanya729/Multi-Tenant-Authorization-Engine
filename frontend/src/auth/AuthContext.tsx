import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../lib/toast";
import { readSession, setUnauthorizedListener, writeSession, type Session } from "../api/client";
import { authApi } from "../api/endpoints";
import type { Me } from "../api/types";
import { hasDuty, hasPlatformDuty } from "../lib/access";

interface AuthState {
  session: Session | null;
  me: Me | undefined;
  meLoading: boolean;
  /** Set when the account details (/api/me) could not be loaded and nothing was loaded before. */
  meError: unknown;
  meRetrying: boolean;
  retryMe: () => void;
  notice: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearNotice: () => void;
  can: (duty: string) => boolean;
  canPlatform: (duty: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [notice, setNotice] = useState<string | null>(null);

  const endSession = useCallback(
    (message: string | null) => {
      writeSession(null);
      setSession(null);
      queryClient.clear();
      setNotice(message);
    },
    [queryClient],
  );

  // Any 401 from the API means the token is gone (expired, logged out elsewhere, user disabled, tenant suspended).
  useEffect(() => {
    setUnauthorizedListener(() => endSession("Your session has ended. Please sign in again."));
  }, [endSession]);

  useEffect(() => {
    if (!session) return;
    // setTimeout overflows above ~24.8 days, so cap it; the timer simply re-arms when the session object changes.
    const MAX = 2_000_000_000;
    const ms = Math.min(Math.max(session.expiresAt - Date.now(), 0), MAX);
    const warnAt = ms - 60_000;
    const warn = warnAt > 0 ? window.setTimeout(() => toast.warning("Your session ends in 1 minute."), warnAt) : undefined;
    const expire = window.setTimeout(() => endSession("Your session has expired. Please sign in again."), ms);
    return () => {
      window.clearTimeout(warn);
      window.clearTimeout(expire);
    };
  }, [session, endSession]);

  // Duties are read live from the database by the backend, so re-reading /api/me shows changes
  // (a granted or revoked duty) within seconds, without signing in again.
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    enabled: !!session,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    const next: Session = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    };
    writeSession(next);
    queryClient.clear();
    setNotice(null);
    setSession(next);
  }, [queryClient]);

  const logout = useCallback(async () => {
    const current = readSession();
    if (current) {
      try {
        await authApi.logout(current.refreshToken);
      } catch {
        /* the session is cleared locally either way */
      }
    }
    endSession(null);
  }, [endSession]);

  const me = session ? meQuery.data : undefined;
  const value = useMemo<AuthState>(() => ({
    session,
    me,
    meLoading: !!session && meQuery.isPending,
    meError: session && !meQuery.data ? meQuery.error : null,
    meRetrying: meQuery.isFetching,
    retryMe: () => void meQuery.refetch(),
    notice,
    login,
    logout,
    clearNotice: () => setNotice(null),
    can: (duty) => hasDuty(me, duty),
    canPlatform: (duty) => hasPlatformDuty(me, duty),
  }), [session, me, meQuery, notice, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
