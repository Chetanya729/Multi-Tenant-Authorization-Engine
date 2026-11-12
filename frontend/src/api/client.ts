const SESSION_KEY = "session";

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;
  readonly code: string | undefined;

  constructor(status: number, message: string, fields: Record<string, string> = {}, code?: string) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.code = code;
  }

  get passwordChangeRequired() {
    return this.status === 403 && (this.code === "PASSWORD_CHANGE_REQUIRED" || this.message === "PASSWORD_CHANGE_REQUIRED");
  }
}

// One tab = one session. sessionStorage keeps it across reloads but lets two tabs sign in as two people,
// which is handy for demonstrating approvals and live revocation side by side.
export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: the session simply lasts until reload */
  }
}

type UnauthorizedListener = () => void;
let onUnauthorized: UnauthorizedListener = () => {};
export function setUnauthorizedListener(listener: UnauthorizedListener) {
  onUnauthorized = listener;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  auth?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = options;
  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const session = auth ? readSession() : null;
  if (session) headers.Authorization = `Bearer ${session.accessToken}`;

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running on port 8080?");
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const payload = (data ?? {}) as { error?: string; message?: string; code?: string; fields?: Record<string, string> };
    const message = payload.error ?? payload.message ?? response.statusText ?? "Request failed";
    if (response.status === 401 && auth) onUnauthorized();
    throw new ApiError(response.status, message, payload.fields ?? {}, payload.code);
  }
  return data as T;
}
