const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency = "INR", compact = false) {
  const key = `${currency}-${compact}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency,
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 1 : 2,
      });
    } catch {
      formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
    }
    moneyFormatters.set(key, formatter);
  }
  return formatter.format(amount);
}

export function formatDate(iso: string | null | undefined, withTime = true) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), "day");
  return formatDate(iso, false);
}

export function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

export function initials(email: string) {
  const parts = nameFromEmail(email).split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function humanize(code: string) {
  return code
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** 16-character password with upper, lower, digit and symbol, from the browser's secure random source. */
export function generatePassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*-_"];
  const all = sets.join("");
  const pick = (chars: string) => {
    // Rejection sampling avoids modulo bias.
    const limit = 256 - (256 % chars.length);
    for (;;) {
      const b = crypto.getRandomValues(new Uint8Array(1))[0]!;
      if (b < limit) return chars[b % chars.length]!;
    }
  };
  const out = [...sets.map(pick), ...Array.from({ length: 12 }, () => pick(all))];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.join("");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}
