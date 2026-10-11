import "@mdxeditor/editor/style.css";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  codeBlockPlugin,
  DiffSourceToggleWrapper,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  ListsToggle,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  MDXEditor,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import { useEffect, useState } from "react";
import { convertToWebp } from "../../lib/image";
import { mdxComponents } from "../../lib/mdx-components";
import { renderMdxToHtml } from "../../lib/render-mdx";

type Status = "draft" | "published";

interface InitialArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  bodyMdx: string;
  status: Status;
  ogImageKey: string | null;
}

interface Props {
  initial: InitialArticle | null;
}

const inputClass = "mt-1 w-full rounded-md border px-3 py-2 text-sm";

export default function ArticleEditor({ initial }: Props) {
  const articleId = initial?.id ?? null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [bodyMdx, setBodyMdx] = useState(initial?.bodyMdx ?? "");
  const [status, setStatus] = useState<Status>(initial?.status ?? "draft");
  const [ogImageKey, setOgImageKey] = useState<string | null>(initial?.ogImageKey ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>(
    initial?.ogImageKey ? `/media/${initial.ogImageKey}` : null,
  );
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Live preview: the same compiler used on save, so the author sees exactly
  // what will be published (Stat, Reveal, mdxcn components included).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const html = await renderMdxToHtml(bodyMdx, mdxComponents);
        if (!cancelled) {
          setPreview(html);
          setPreviewError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : String(error));
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bodyMdx]);

  async function uploadCover(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const { blob, width, height } = await convertToWebp(file);
      const form = new FormData();
      const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
      form.append("file", new File([blob], name, { type: "image/webp" }));
      form.append("width", String(width));
      form.append("height", String(height));
      form.append("alt", title);

      const res = await fetch("/admin/api/media/", { method: "POST", body: form });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(err.error ?? "Échec de l'envoi de l'image.");
        return;
      }
      const data = (await res.json()) as { key: string; url: string };
      setOgImageKey(data.key);
      setCoverUrl(data.url);
      setMessage("Image envoyée. Enregistrez pour l'appliquer.");
    } catch (error) {
      setMessage(`Erreur image : ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading(false);
    }
  }

  async function save(): Promise<{ id: string; slug: string } | null> {
    if (!title.trim()) {
      setMessage("Le titre est obligatoire.");
      return null;
    }

    setBusy(true);
    setMessage(null);
    try {
      const bodyHtml = await renderMdxToHtml(bodyMdx, mdxComponents);
      const payload = {
        title,
        slug: slug.trim() || undefined,
        description,
        bodyMdx,
        bodyHtml,
        ogImageKey,
      };

      const res = await fetch(
        articleId ? `/admin/api/articles/${articleId}/` : "/admin/api/articles/",
        {
          method: articleId ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(err.error ?? "Erreur à l'enregistrement.");
        return null;
      }

      const data = (await res.json()) as { id: string; slug: string };
      if (!articleId) {
        window.location.href = `/admin/${data.id}`;
      } else {
        setSlug(data.slug);
        setMessage("Enregistré.");
      }
      return data;
    } catch (error) {
      setMessage(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: Status) {
    const saved = await save();
    if (!saved?.id) return;

    setBusy(true);
    try {
      const res = await fetch(`/admin/api/articles/${saved.id}/status/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setMessage("Erreur lors du changement de statut.");
        return;
      }
      setStatus(next);
      window.location.href = "/admin";
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
      <h1 className="text-2xl font-semibold">
        {articleId ? "Modifier l'article" : "Nouvel article"}
      </h1>

      <div>
        <label className="block text-sm font-medium" htmlFor="title">
          Titre
        </label>
        <input
          id="title"
          data-testid="title"
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="slug">
          Slug (optionnel, généré depuis le titre)
        </label>
        <input
          id="slug"
          data-testid="slug"
          className={inputClass}
          value={slug}
          placeholder="le-mystere-de-barabbas"
          onChange={(event) => setSlug(event.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="description">
          Description (SEO)
        </label>
        <textarea
          id="description"
          data-testid="description"
          className={inputClass}
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div>
        <span className="block text-sm font-medium">Image de couverture</span>
        {coverUrl && (
          <img src={coverUrl} alt="" className="mt-2 h-32 rounded-md border object-cover" />
        )}
        <input
          type="file"
          accept="image/*"
          data-testid="cover-input"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadCover(file);
          }}
          className="mt-2 block text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Convertie en WebP dans le navigateur avant l'envoi.
        </p>
      </div>

      <div>
        <span className="block text-sm font-medium">Contenu (MDX)</span>
        <div data-testid="body-editor" className="mt-1 rounded-md border">
          <MDXEditor
            markdown={bodyMdx}
            onChange={setBodyMdx}
            plugins={[
              headingsPlugin(),
              listsPlugin(),
              quotePlugin(),
              thematicBreakPlugin(),
              linkPlugin(),
              linkDialogPlugin(),
              imagePlugin(),
              codeBlockPlugin(),
              diffSourcePlugin(),
              markdownShortcutPlugin(),
              toolbarPlugin({
                toolbarContents: () => (
                  <DiffSourceToggleWrapper>
                    <UndoRedo />
                    <BoldItalicUnderlineToggles />
                    <BlockTypeSelect />
                    <ListsToggle />
                    <CreateLink />
                  </DiffSourceToggleWrapper>
                ),
              }),
            ]}
          />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium">Aperçu</span>
        <div
          data-testid="preview"
          className="mdx-preview mt-1 rounded-md border p-4"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: compiled locally from the author's own MDX
          dangerouslySetInnerHTML={{ __html: preview }}
        />
        {previewError && <p className="mt-1 text-xs text-destructive">{previewError}</p>}
      </div>

      {message && (
        <p data-testid="message" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          data-testid="save"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Enregistrer
        </button>

        {status === "published" ? (
          <button
            type="button"
            data-testid="unpublish"
            onClick={() => void changeStatus("draft")}
            disabled={busy}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
          >
            Dépublier
          </button>
        ) : (
          <button
            type="button"
            data-testid="publish"
            onClick={() => void changeStatus("published")}
            disabled={busy}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
          >
            Publier
          </button>
        )}
      </div>
    </form>
  );
}
