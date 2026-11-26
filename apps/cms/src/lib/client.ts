/**
 * Browser-side client for the admin API. Turns the shared error envelope into
 * an `ApiError` that carries the code and the per-field issues.
 */

export interface ApiIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly issues: ApiIssue[] = [],
    readonly status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The message for one field, if the API rejected it. */
  issueFor(path: string): string | undefined {
    return this.issues.find((issue) => issue.path === path)?.message;
  }
}

function isIssue(value: unknown): value is ApiIssue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApiIssue).path === "string" &&
    typeof (value as ApiIssue).message === "string"
  );
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: unknown; message?: unknown; details?: { issues?: unknown } };
  } | null;

  const code = typeof body?.error?.code === "string" ? body.error.code : "INTERNAL";
  const message =
    typeof body?.error?.message === "string" && body.error.message
      ? body.error.message
      : `Request failed (${response.status}).`;
  const rawIssues = body?.error?.details?.issues;
  const issues = Array.isArray(rawIssues) ? rawIssues.filter(isIssue) : [];

  return new ApiError(code, message, issues, response.status);
}

/** `fetch` for the admin API: JSON in, JSON out, typed errors. */
export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  if (init?.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}
