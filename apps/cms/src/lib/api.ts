/**
 * The JSON contract every admin endpoint speaks.
 *
 * Success: any JSON shape, with 2xx.
 * Failure: `{ error: { code, message, details? } }`, where `details.issues`
 * lists one entry per invalid field so a form can point at the right input.
 */

export type ApiErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "REVISION_CONFLICT"
  | "CONFLICT"
  | "INTERNAL";

export interface ApiIssue {
  path: string;
  message: string;
}

export interface ApiErrorDetails {
  issues?: ApiIssue[];
  [key: string]: unknown;
}

export function apiOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: ApiErrorDetails,
): Response {
  return apiOk({ error: { code, message, ...(details ? { details } : {}) } }, status);
}

export function validationError(issues: ApiIssue[]): Response {
  return apiError("VALIDATION", issues[0]?.message ?? "The request is invalid.", 400, { issues });
}

export function notFoundError(message: string): Response {
  return apiError("NOT_FOUND", message, 404);
}

export function conflictError(message: string, details?: ApiErrorDetails): Response {
  return apiError("REVISION_CONFLICT", message, 409, details);
}

/** A required, non-blank string. Returns an issue instead of throwing. */
export function requiredText(value: unknown, path: string, label: string): ApiIssue | null {
  if (typeof value !== "string" || value.trim() === "") {
    return { path, message: `${label} is required.` };
  }
  return null;
}

/** Drops the `null`s a list of optional checks produces. */
export function issues(...checks: (ApiIssue | null)[]): ApiIssue[] {
  return checks.filter((issue): issue is ApiIssue => issue !== null);
}

/**
 * Reads an optimistic concurrency token. Returns `undefined` when the caller
 * did not send one (the write is then unconditional) and an issue when the
 * value is not a positive integer.
 */
export function parseRev(value: unknown): number | undefined | ApiIssue {
  if (value === undefined || value === null) return undefined;
  const rev = typeof value === "string" ? Number(value) : value;
  if (typeof rev !== "number" || !Number.isInteger(rev) || rev < 1) {
    return { path: "rev", message: "rev must be a positive integer." };
  }
  return rev;
}
