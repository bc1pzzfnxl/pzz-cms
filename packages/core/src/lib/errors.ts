/**
 * Errors the content module throws. They carry a stable `code` so the admin can
 * map them to HTTP responses without matching on messages.
 */

/** A write was based on a revision the row no longer has. */
export class RevisionConflictError extends Error {
  readonly code = "REVISION_CONFLICT";

  constructor(
    readonly id: string,
    readonly expected: number,
    readonly actual: number,
  ) {
    super(`Revision conflict on ${id}: expected ${expected}, found ${actual}`);
    this.name = "RevisionConflictError";
  }
}

export function isRevisionConflict(error: unknown): error is RevisionConflictError {
  return error instanceof RevisionConflictError;
}
