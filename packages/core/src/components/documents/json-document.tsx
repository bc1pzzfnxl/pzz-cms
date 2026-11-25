import type { ReactNode } from "react";

/**
 * Generic JSON document renderer. It adapts to any shape:
 * - a vertical table of contents (tree) at the top;
 * - objects become definition lists;
 * - arrays of primitives become chips (short) or lists (long);
 * - arrays of objects become full-width cards;
 * - nested objects become sub-sections.
 *
 * A root `meta` object is rendered as a header. The output is semantic HTML, so
 * the page is indexable. See PLAN.md.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
  return (
    value === null || value === undefined || ["string", "number", "boolean"].includes(typeof value)
  );
}

function humanize(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function headingOf(item: Record<string, unknown>, fallback: string): string {
  const candidate = item.nom ?? item.titre ?? item.title ?? item.name ?? item.label ?? item.id;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback;
}

function anchorOf(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function Scalar({ value }: { value: string | number | boolean | null | undefined }): ReactNode {
  if (value === null || value === undefined) return <span className="json-empty">—</span>;
  return <span className="json-scalar">{String(value)}</span>;
}

function ProseList({ items }: { items: unknown[] }): ReactNode {
  const short = items.every((item) => typeof item !== "string" || item.length <= 80);

  if (short) {
    return (
      <ul className="json-chips">
        {items.map((item) => (
          <li key={String(item)} className="json-chip">
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="json-list">
      {items.map((item) => (
        <li key={String(item)}>{String(item)}</li>
      ))}
    </ul>
  );
}

function ObjectFields({ data, path }: { data: Record<string, unknown>; path: string }): ReactNode {
  const entries = Object.entries(data);
  const primitives = entries.filter(([, value]) => isPrimitive(value));
  const nested = entries.filter(([, value]) => !isPrimitive(value));

  return (
    <>
      {primitives.length > 0 && (
        <dl className="json-defs">
          {primitives.map(([key, value]) => (
            <div key={key} className="json-def">
              <dt>{humanize(key)}</dt>
              <dd>
                <Scalar value={value as string | number | boolean | null | undefined} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {nested.map(([key, value]) => {
        const id = `${path}-${anchorOf(key)}`;
        return (
          <section key={key} className="json-subsection">
            <h4 id={id}>{humanize(key)}</h4>
            <Value value={value} path={id} />
          </section>
        );
      })}
    </>
  );
}

function Value({ value, path }: { value: unknown; path: string }): ReactNode {
  if (isPrimitive(value)) {
    return <Scalar value={value as string | number | boolean | null | undefined} />;
  }

  if (Array.isArray(value)) {
    if (value.every((item) => isPrimitive(item))) {
      return <ProseList items={value} />;
    }

    return (
      <div className="json-cards">
        {value.map((item, index) => {
          const id = `${path}-${index + 1}`;
          if (isObject(item)) {
            const title = headingOf(item, `Élément ${index + 1}`);
            return (
              <article key={id} id={id} className="json-card">
                <h3>{title}</h3>
                <ObjectFields data={item} path={id} />
              </article>
            );
          }
          return (
            <article key={id} id={id} className="json-card">
              <Value value={item} path={id} />
            </article>
          );
        })}
      </div>
    );
  }

  if (isObject(value)) {
    return <ObjectFields data={value} path={path} />;
  }

  return null;
}

function pick(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
        date,
      );
}

/**
 * Editorial header for a root `meta` object: a single metadata line
 * (author · version · date) and the principles as a lead block, not a form.
 * The title is already the page `<h1>`, so it is not repeated.
 */
function MetaHeader({ meta }: { meta: Record<string, unknown> }): ReactNode {
  const known = new Set([
    "titre",
    "title",
    "name",
    "auteur",
    "author",
    "version",
    "date",
    "principes_directeurs",
    "principes",
    "principles",
  ]);

  const author = pick(meta, ["auteur", "author"]);
  const version = pick(meta, ["version"]);
  const date = pick(meta, ["date"]);
  const principlesValue = meta.principes_directeurs ?? meta.principes ?? meta.principles;
  const principles = Array.isArray(principlesValue)
    ? principlesValue.filter((item): item is string => typeof item === "string")
    : [];
  const rest = Object.fromEntries(Object.entries(meta).filter(([key]) => !known.has(key)));

  return (
    <div className="json-hero">
      {(author || version || date) && (
        <ul className="json-hero-meta">
          {author && <li>{author}</li>}
          {version && <li>v{version}</li>}
          {date && (
            <li>
              <time dateTime={date}>{formatDate(date)}</time>
            </li>
          )}
        </ul>
      )}

      {principles.length > 0 && (
        <section className="json-principles">
          <h2>Principes directeurs</h2>
          <ul>
            {principles.map((principle) => (
              <li key={principle}>{principle}</li>
            ))}
          </ul>
        </section>
      )}

      {Object.keys(rest).length > 0 && <ObjectFields data={rest} path="meta" />}
    </div>
  );
}

export interface JsonDocumentViewProps {
  data: unknown;
}

export function JsonDocumentView({ data }: JsonDocumentViewProps) {
  if (!isObject(data)) {
    return (
      <div className="json-document">
        <Value value={data} path="root" />
      </div>
    );
  }

  const meta = isObject(data.meta) ? data.meta : null;
  const sections = Object.entries(data).filter(([key]) => key !== "meta");

  const toc = sections.map(([key, value]) => {
    const id = `s-${anchorOf(key)}`;
    const children = Array.isArray(value)
      ? value.flatMap((item, index) => {
          if (!isObject(item)) return [];
          const label = headingOf(item, "");
          return label ? [{ id: `${id}-${index + 1}`, label }] : [];
        })
      : [];
    return { id, label: humanize(key), children };
  });

  return (
    <>
      {meta && <MetaHeader meta={meta} />}

      {toc.length > 0 && (
        <nav className="json-toc" aria-label="Sommaire">
          <p className="json-toc-title">Sommaire</p>
          <ul className="json-toc-list">
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.label}</a>
                {item.children.length > 0 && (
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <a href={`#${child.id}`}>{child.label}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="json-document">
        {sections.map(([key, value]) => {
          const id = `s-${anchorOf(key)}`;
          return (
            <section key={key} className="json-section">
              <h2 id={id}>{humanize(key)}</h2>
              <Value value={value} path={id} />
            </section>
          );
        })}
      </div>
    </>
  );
}

export default JsonDocumentView;
