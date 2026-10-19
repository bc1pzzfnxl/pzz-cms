import { useState } from "react";
import { JsonDocumentView } from "../documents/json-document";

type Status = "draft" | "published";

interface InitialDocument {
  id: string;
  slug: string;
  title: string;
  description: string;
  bodyJson: string;
  status: Status;
}

interface Props {
  initial: InitialDocument;
}

const input = "mt-1 w-full rounded-md border px-3 py-2 text-sm";

export default function DocumentEditor({ initial }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [bodyJson, setBodyJson] = useState(initial.bodyJson);
  const [status, setStatus] = useState<Status>(initial.status);
  const [message, setMessage] = useState<string | null>(null);
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
      setMessage(`JSON invalide : ${jsonError}`);
      return false;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/admin/api/documents/${initial.id}/`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, slug, description, bodyJson }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(data.error ?? "Erreur à l'enregistrement.");
        return false;
      }
      const data = (await response.json()) as { slug: string };
      setSlug(data.slug);
      setMessage("Enregistré.");
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
        setMessage("Erreur lors du changement de statut.");
        return;
      }
      setStatus(next);
      window.location.href = "/admin/documents";
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
            Titre
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
            className="mt-1 h-[28rem] w-full rounded-md border px-3 py-2 font-mono text-xs"
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
          <span className="block text-sm font-medium">Aperçu</span>
          <div className="mt-1 h-[28rem] overflow-auto rounded-md border px-4 py-3">
            {jsonError ? (
              <p className="text-sm text-destructive">JSON invalide.</p>
            ) : (
              <JsonDocumentView data={parsed} />
            )}
          </div>
        </div>
      </div>

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
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Enregistrer
        </button>
        {status === "published" ? (
          <button
            type="button"
            data-testid="document-unpublish"
            onClick={() => void changeStatus("draft")}
            disabled={busy}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
          >
            Dépublier
          </button>
        ) : (
          <button
            type="button"
            data-testid="document-publish"
            onClick={() => void changeStatus("published")}
            disabled={busy}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
          >
            Publier
          </button>
        )}
        <a
          href={`/${slug}/`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border px-4 py-2 text-sm"
        >
          Voir la page ↗
        </a>
      </div>
    </form>
  );
}
