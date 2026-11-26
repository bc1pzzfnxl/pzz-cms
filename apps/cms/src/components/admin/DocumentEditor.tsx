import { JsonDocumentView } from "@pzz-cms/core";
import { useState } from "react";
import { ApiError, toApiError } from "../../lib/client";

type Status = "draft" | "published";

interface InitialDocument {
  id: string;
  slug: string;
  title: string;
  description: string;
  bodyJson: string;
  status: Status;
  /** Optimistic concurrency token, sent back on save. */
  rev: number;
}

interface Props {
  initial: InitialDocument;
}

const input = "input mt-1";

export default function DocumentEditor({ initial }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [bodyJson, setBodyJson] = useState(initial.bodyJson);
  const [status, setStatus] = useState<Status>(initial.status);
  const [rev, setRev] = useState(initial.rev);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);

  let parsed: unknown = null;
  let jsonError: string | null = null;
  try {
    parsed = JSON.parse(bodyJson);
  } catch (cause) {
    jsonError = cause instanceof Error ? cause.message : String(cause);
  }

  async function save(): Promise<boolean> {
    if (jsonError) {
      setMessage(`Invalid JSON: ${jsonError}`);
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/admin/api/documents/${initial.id}/`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, slug, description, bodyJson, rev }),
      });
      if (!response.ok) {
        const error = await toApiError(response);
        if (error instanceof ApiError && error.code === "REVISION_CONFLICT") {
          setConflict(true);
        }
        setMessage(error.message);
        return false;
      }
      const data = (await response.json()) as { slug: string; rev: number };
      setSlug(data.slug);
      setRev(data.rev);
      setMessage("Saved.");
      return true;
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: Status) {
    if (!(await save())) return;
    setBusy(true);
    try {
      const response = await fetch(`/admin/api/documents/${initial.id}/status/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const error = await toApiError(response);
        setMessage(error.message);
        return;
      }
      const data = (await response.json()) as { rev: number };
      setRev(data.rev);
      setStatus(next);
      window.location.href = "/admin/documents/";
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            data-testid="document-title"
            className={input}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            data-testid="document-slug"
            className={input}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="description">
          Description (SEO)
        </label>
        <textarea
          id="description"
          className={input}
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <span className="block text-sm font-medium">JSON</span>
          <textarea
            data-testid="document-json"
            className="textarea mt-1 h-[28rem] font-mono text-xs"
            value={bodyJson}
            onChange={(event) => setBodyJson(event.target.value)}
            spellCheck={false}
          />
          {jsonError && (
            <p data-testid="document-json-error" className="mt-1 text-xs text-destructive">
              {jsonError}
            </p>
          )}
        </div>

        <div>
          <span className="block text-sm font-medium">Preview</span>
          <div className="mt-1 h-[28rem] overflow-auto rounded-md border px-4 py-3">
            {jsonError ? (
              <p className="text-sm text-destructive">Invalid JSON.</p>
            ) : (
              <JsonDocumentView data={parsed} />
            )}
          </div>
        </div>
      </div>

      {conflict && (
        <div className="card border-destructive/40 p-4 text-sm" data-testid="document-conflict">
          <p className="font-medium">This document changed in another tab.</p>
          <p className="mt-1 text-muted-foreground">
            Reload to get the latest version; this page will not overwrite it.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm mt-3"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )}

      {message && (
        <p data-testid="document-message" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          data-testid="document-save"
          disabled={busy || jsonError !== null}
          className="btn btn-primary"
        >
          Save
        </button>
        {status === "published" ? (
          <button
            type="button"
            data-testid="document-unpublish"
            onClick={() => void changeStatus("draft")}
            disabled={busy}
            className="btn btn-outline"
          >
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            data-testid="document-publish"
            onClick={() => void changeStatus("published")}
            disabled={busy}
            className="btn btn-outline"
          >
            Publish
          </button>
        )}
        <a href={`/${slug}/`} target="_blank" rel="noreferrer" className="btn btn-outline">
          View page ↗
        </a>
      </div>
    </form>
  );
}
