import { ApiError } from "../api/client";

/** Turns an API error into a short message a user can act on. */
export function explain(error: unknown, context?: "approve" | "reject" | "assign" | "status" | "limit"): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : "Something went wrong.";
  if (error.status === 0) return "Cannot reach the server.";
  if (error.status === 400 && Object.keys(error.fields).length) return "Please correct the highlighted fields.";
  if (error.status === 403) {
    switch (context) {
      case "approve": return "Not permitted. The amount may exceed your approval limit.";
      case "reject": return "Not permitted.";
      case "assign": return "Not permitted. You can only grant access you hold yourself.";
      case "status": return "Not permitted. This user has access you don't hold.";
      case "limit": return "Not permitted. You can't change the limit of your own role.";
      default: return "Not permitted.";
    }
  }
  if (error.status === 409) return error.message;
  if (error.status === 404) return "Not found.";
  return error.message;
}

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError ? error.fields : {};
}
