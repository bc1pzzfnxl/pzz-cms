import "@mdxeditor/editor/style.css";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  codeBlockPlugin,
  DiffSourceToggleWrapper,
  diffSourcePlugin,
  GenericJsxEditor,
  headingsPlugin,
  InsertImage,
  imagePlugin,
  type JsxComponentDescriptor,
  jsxPlugin,
  ListsToggle,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  MDXEditor,
  type MDXEditorMethods,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import {
  convertToWebp,
  convertToWebpVariants,
  MEDIA_VARIANT_WIDTHS,
  mdxComponents,
  normalizeMdxJsx,
  optimizeBodyImages,
  renderMdxToHtml,
} from "@pzz-cms/core";
import { useEffect, useRef, useState } from "react";
import { ApiError, toApiError } from "../../lib/client";

type Status = "draft" | "published";

interface InitialArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  bodyMdx: string;
  status: Status;
  ogImageKey: string | null;
  coverAlt: string | null;
  categoryId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** Optimistic concurrency token, sent back on save. */
  rev: number;
}

interface Props {
  initial: InitialArticle | null;
  categories: { id: string; name: string }[];
}

const inputClass = "input mt-1";

const formatEditorDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
        date,
      );
};

/**
 * Raw JSX must survive the rich-text editor. Without descriptors MDXEditor
 * treats `<Callout>` as HTML and escapes it to `\<Callout...\>`, which the MDX
 * compiler then renders as text. Register every component authors may write.
 */
const jsxComponentDescriptors: JsxComponentDescriptor[] = [
  {
    name: "Callout",
    kind: "flow",
    props: [
      { name: "type", type: "string" },
      { name: "title", type: "string" },
      { name: "corner", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "Quote",
    kind: "flow",
    props: [
      { name: "by", type: "string" },
      { name: "source", type: "string" },
      { name: "title", type: "string" },
      { name: "corner", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "Steps",
    kind: "flow",
    props: [
      { name: "title", type: "string" },
      { name: "corner", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "Terminal",
    kind: "flow",
    props: [
      { name: "title", type: "string" },
      { name: "prompt", type: "string" },
      { name: "corner", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "Faq",
    kind: "flow",
    props: [
      { name: "title", type: "string" },
      { name: "entries", type: "expression" },
      { name: "palette", type: "string" },
      { name: "corner", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "Figure",
    kind: "flow",
    props: [
      { name: "src", type: "string", required: true },
      { name: "alt", type: "string", required: true },
      { name: "caption", type: "string" },
      { name: "credit", type: "string" },
      { name: "href", type: "string" },
      { name: "width", type: "string" },
      { name: "height", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: false,
    Editor: GenericJsxEditor,
  },
  {
    name: "GraphCompare",
    kind: "flow",
    props: [
      { name: "title", type: "string", required: true },
      { name: "columns", type: "expression" },
      { name: "rows", type: "expression" },
      { name: "accent", type: "string" },
      { name: "palette", type: "string" },
      { name: "corner", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "GraphStat",
    kind: "flow",
    props: [
      { name: "title", type: "string", required: true },
      { name: "items", type: "expression" },
      { name: "corner", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "GraphTable",
    kind: "flow",
    props: [
      { name: "title", type: "string", required: true },
      { name: "headers", type: "expression" },
      { name: "rows", type: "expression" },
      { name: "footer", type: "expression" },
      { name: "align", type: "expression" },
      { name: "corner", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "GraphTimeline",
    kind: "flow",
    props: [
      { name: "title", type: "string", required: true },
      { name: "events", type: "expression" },
      { name: "palette", type: "string" },
      { name: "corner", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "Stat",
    kind: "text",
    props: [
      { name: "value", type: "expression", required: true },
      { name: "format", type: "string" },
      { name: "currency", type: "string" },
      { name: "locale", type: "string" },
      { name: "suffix", type: "string" },
    ],
    hasChildren: false,
    Editor: GenericJsxEditor,
  },
  {
    name: "Reveal",
    kind: "text",
    props: [],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
  {
    name: "Verse",
    kind: "flow",
    props: [
      { name: "reference", type: "string", required: true },
      { name: "version", type: "string" },
      { name: "original", type: "string" },
      { name: "originalLabel", type: "string" },
      { name: "href", type: "string" },
      { name: "className", type: "string" },
    ],
    hasChildren: true,
    Editor: GenericJsxEditor,
  },
];

const componentNames = Object.keys(mdxComponents);
const jsxPastePattern = new RegExp(`<\\s*(?:${componentNames.join("|")})\\b`);

export default function ArticleEditor({ initial, categories }: Props) {
  const articleId = initial?.id ?? null;
  const editorRef = useRef<MDXEditorMethods>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [bodyMdx, setBodyMdx] = useState(initial?.bodyMdx ?? "");
  const [status, setStatus] = useState<Status>(initial?.status ?? "draft");
  const [rev, setRev] = useState(initial?.rev ?? 0);
  const [conflict, setConflict] = useState(false);
  const [ogImageKey, setOgImageKey] = useState<string | null>(initial?.ogImageKey ?? null);
  const [coverAlt, setCoverAlt] = useState(initial?.coverAlt ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>(
    initial?.ogImageKey ? `/media/${initial.ogImageKey}` : null,
  );
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [mediaDims, setMediaDims] = useState<Map<string, { width: number; height: number }>>(
    new Map(),
  );

  // Intrinsic dimensions of every known image, so the live preview reserves
  // space and picks variants exactly like the published page does.
  useEffect(() => {
    let cancelled = false;
    fetch("/admin/api/media/")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: { key: string; width: number | null; height: number | null }[]) => {
        if (cancelled) return;
        const dims = new Map<string, { width: number; height: number }>();
        for (const row of rows) {
          if (row.width && row.height) dims.set(row.key, { width: row.width, height: row.height });
        }
        setMediaDims(dims);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Live preview: the same compiler used on save, so the author sees exactly
  // what will be published (Stat, Reveal, mdxcn components included).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const html = await renderMdxToHtml(normalizeMdxJsx(bodyMdx, componentNames), mdxComponents);
        if (!cancelled) {
          setPreview(optimizeBodyImages(html, mediaDims));
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
  }, [bodyMdx, mediaDims]);

  async function uploadMedia(file: File, alt: string) {
    const { blob, width, height } = await convertToWebp(file);
    const variants = await convertToWebpVariants(
      file,
      MEDIA_VARIANT_WIDTHS.filter((variantWidth) => variantWidth < width),
      0.85,
    );
    const form = new FormData();
    const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
    form.append("file", new File([blob], name, { type: "image/webp" }));
    for (const variant of variants) {
      form.append(
        `variant-${variant.width}`,
        new File([variant.blob], `${name.replace(/\.webp$/, "")}-${variant.width}.webp`, {
          type: "image/webp",
        }),
      );
    }
    form.append("width", String(width));
    form.append("height", String(height));
    form.append("alt", alt);

    const res = await fetch("/admin/api/media/", { method: "POST", body: form });
    if (!res.ok) {
      const err = await toApiError(res);
      throw new Error(err.message);
    }
    const data = (await res.json()) as {
      key: string;
      url: string;
      width: number | null;
      height: number | null;
    };
    const { key, width: mediaWidth, height: mediaHeight } = data;
    if (mediaWidth !== null && mediaHeight !== null) {
      // Register the new image immediately so the preview renders it with
      // dimensions without waiting for a reload.
      setMediaDims((prev) => new Map(prev).set(key, { width: mediaWidth, height: mediaHeight }));
    }
    return data;
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const data = await uploadMedia(file, coverAlt.trim());
      setOgImageKey(data.key);
      setCoverUrl(data.url);
      setMessage("Image uploaded. Save to apply it.");
    } catch (error) {
      setMessage(`Image error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading(false);
    }
  }

  // MDXEditor image upload: convert to WebP in the browser, store in R2 and
  // insert the public /media/ URL. The alt is left empty; edit the markdown.
  const uploadBodyImage = (image: File): Promise<string> =>
    uploadMedia(image, "").then((data) => data.url);

  async function save(): Promise<{ id: string; slug: string; rev: number } | null> {
    if (!title.trim()) {
      setMessage("The title is required.");
      return null;
    }

    setBusy(true);
    setMessage(null);
    try {
      const source = normalizeMdxJsx(bodyMdx, componentNames);
      const bodyHtml = await renderMdxToHtml(source, mdxComponents);
      const payload = {
        title,
        slug: slug.trim() || undefined,
        description,
        bodyMdx: source,
        bodyHtml,
        ogImageKey,
        coverAlt: coverAlt.trim() || null,
        categoryId,
        ...(articleId ? { rev } : {}),
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
        const err = await toApiError(res);
        if (err instanceof ApiError && err.code === "REVISION_CONFLICT") {
          setConflict(true);
          setMessage(err.message);
          return null;
        }
        setMessage(err.issueFor("title") ?? err.message);
        return null;
      }

      const data = (await res.json()) as { id: string; slug: string; rev: number };
      if (!articleId) {
        window.location.href = `/admin/${data.id}`;
      } else {
        setSlug(data.slug);
        setRev(data.rev);
        setMessage(null);
        (window as Window & { toast?: (message: string) => void }).toast?.("Saved.");
      }
      return data;
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        const err = await toApiError(res);
        setMessage(err.message);
        return;
      }
      setStatus(next);
      window.location.assign("/admin/articles/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/admin/articles/" className="hover:underline">
            Articles
          </a>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="max-w-[420px] truncate font-medium text-foreground">
            {articleId ? title || "Untitled" : "New article"}
          </span>
          {status === "published" ? (
            <span className="badge badge-published ml-1">published</span>
          ) : (
            <span className="badge badge-draft ml-1">draft</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/articles/" className="btn btn-ghost">
            Annuler
          </a>
          <button type="submit" data-testid="save" disabled={busy} className="btn btn-outline">
            Save
          </button>
          {status === "published" ? (
            <button
              type="button"
              data-testid="unpublish"
              onClick={() => void changeStatus("draft")}
              disabled={busy}
              className="btn btn-outline"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              data-testid="publish"
              onClick={() => void changeStatus("published")}
              disabled={busy}
              className="btn btn-primary"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 items-start gap-4">
        <div className="col-span-2 space-y-4">
          <div className="card space-y-5 p-6">
            <div>
              <label className="block text-sm font-medium" htmlFor="title">
                Title
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
                Slug (optional, generated from the title)
              </label>
              <input
                id="slug"
                data-testid="slug"
                className={inputClass}
                value={slug}
                placeholder="the-barabbas-mystery"
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
              <label className="block text-sm font-medium" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                data-testid="category"
                className={inputClass}
                value={categoryId ?? ""}
                onChange={(event) => setCategoryId(event.target.value || null)}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-sm font-medium">Cover image</span>
              {coverUrl && (
                <img src={coverUrl} alt="" className="mt-2 h-32 rounded-md border object-cover" />
              )}
              <label className="mt-3 block text-sm">
                <span className="font-medium">Cover alt text</span>
                <input
                  className={inputClass}
                  value={coverAlt}
                  onChange={(event) => setCoverAlt(event.target.value)}
                  placeholder="Describe the image: subject, source, date"
                  data-testid="cover-alt"
                />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Shown under the image and read by screen readers. Empty: the article title is used
                as the fallback.
              </p>
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
                Converted to WebP in the browser before upload.
              </p>
            </div>
          </div>

          <div className="card p-4">
            <span className="block text-sm font-medium">Body (MDX)</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Components: Callout, Quote, Steps, Terminal, Faq, Figure, GraphCompare, GraphStat,
              GraphTable, GraphTimeline, Stat, Reveal, Verse. For raw JSX, use Source mode (the
              Diff/Source toggle).
            </p>
            <div
              data-testid="body-editor"
              className="mt-1 rounded-md border"
              onPasteCapture={(event) => {
                const text = event.clipboardData.getData("text/plain");
                if (!jsxPastePattern.test(text)) return;
                // Let the MDX parser create a JSX node instead of escaping the
                // pasted tag as text.
                event.preventDefault();
                event.stopPropagation();
                editorRef.current?.insertMarkdown(text);
              }}
            >
              <MDXEditor
                ref={editorRef}
                markdown={bodyMdx}
                onChange={setBodyMdx}
                plugins={[
                  headingsPlugin(),
                  listsPlugin(),
                  quotePlugin(),
                  tablePlugin(),
                  thematicBreakPlugin(),
                  linkPlugin(),
                  linkDialogPlugin(),
                  imagePlugin({ imageUploadHandler: uploadBodyImage }),
                  codeBlockPlugin(),
                  diffSourcePlugin(),
                  jsxPlugin({ jsxComponentDescriptors }),
                  markdownShortcutPlugin(),
                  toolbarPlugin({
                    toolbarContents: () => (
                      <DiffSourceToggleWrapper>
                        <UndoRedo />
                        <BoldItalicUnderlineToggles />
                        <BlockTypeSelect />
                        <ListsToggle />
                        <CreateLink />
                        <InsertImage />
                      </DiffSourceToggleWrapper>
                    ),
                  }),
                ]}
              />
            </div>
          </div>

          <div className="card p-4">
            <span className="block text-sm font-medium">Preview</span>
            <div
              data-testid="preview"
              className="mdx-preview mt-1 rounded-md border p-4"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: compiled locally from the author's own MDX
              dangerouslySetInnerHTML={{ __html: preview }}
            />
            {previewError && <p className="mt-1 text-xs text-destructive">{previewError}</p>}
          </div>

          {conflict && (
            <div className="card border-destructive/40 p-4 text-sm" data-testid="conflict">
              <p className="font-medium">This article changed in another tab.</p>
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
            <p data-testid="message" className="text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-6">
            <div className="text-[15px] font-medium">Publication</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="field-label">Status</div>
                {status === "published" ? (
                  <span className="badge badge-published">published</span>
                ) : (
                  <span className="badge badge-draft">draft</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="mt-0.5 font-medium">
                    {formatEditorDate(initial?.createdAt ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Updated</div>
                  <div className="mt-0.5 font-medium">
                    {formatEditorDate(initial?.updatedAt ?? null)}
                  </div>
                </div>
              </div>
              <div className="rounded-md border p-3 text-[13px]">
                <div className="text-muted-foreground">Public URL</div>
                <div className="mt-1 truncate font-mono text-xs">/{slug || "…"}/</div>
              </div>
            </div>
          </div>
          <div className="card p-6 text-[13px] text-muted-foreground">
            <div className="text-[15px] font-medium text-foreground">Help</div>
            <p className="mt-1.5">
              The preview compiles the MDX with the same engine as publication: what you see is what
              gets served.
            </p>
            <p className="mt-2">
              Images added in the body are converted to WebP, uploaded to R2 and referenced with
              their dimensions.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
