import type { Me } from "../api/types";

export function hasDuty(me: Me | undefined, duty: string) {
  return !!me?.duties.includes(duty);
}

export function hasPlatformDuty(me: Me | undefined, duty: string) {
  return !!me?.platformDuties.includes(duty);
}

/** Groups "resource:action" codes into { resource: [actions] }. */
export function groupDuties(codes: string[]) {
  const groups = new Map<string, string[]>();
  for (const code of [...codes].sort()) {
    const [resource = code, action = ""] = code.split(":");
    groups.set(resource, [...(groups.get(resource) ?? []), action]);
  }
  return groups;
}
