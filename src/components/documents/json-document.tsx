import type { ReactNode } from "react";

/**
 * Generic JSON document renderer. It adapts to any shape:
 * - objects become definition lists (label / value);
 * - arrays of primitives become lists;
 * - arrays of objects become cards with a heading;
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
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Scalar({ value }: { value: string | number | boolean | null | undefined }): ReactNode {
  if (value === null || value === undefined) return <span className="json-empty">—</span>;
  return <span className="json-scalar">{String(value)}</span>;
}

function ObjectFields({ data }: { data: Record<string, unknown> }): ReactNode {
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

      {nested.map(([key, value]) => (
        <section key={key} className="json-subsection">
          <h4 id={anchorOf(key)}>{humanize(key)}</h4>
          <Value value={value} />
        </section>
      ))}
    </>
  );
}

function ArrayItem({ item, index }: { item: unknown; index: number }): ReactNode {
  if (isObject(item)) {
    const title = headingOf(item, `Élément ${index + 1}`);
    return (
      <article className="json-card">
        <h3 id={anchorOf(title)}>{title}</h3>
        <ObjectFields data={item} />
      </article>
    );
  }

  return (
    <li className="json-list-item">
      <Value value={item} />
    </li>
  );
}

function Value({ value }: { value: unknown }): ReactNode {
  if (isPrimitive(value)) {
    return <Scalar value={value as string | number | boolean | null | undefined} />;
  }

  if (Array.isArray(value)) {
    if (value.every((item) => isPrimitive(item))) {
      return (
        <ul className="json-list">
          {value.map((item) => (
            <li key={String(item)}>
              <Scalar value={item as string | number | boolean | null | undefined} />
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div className="json-array">
        {value.map((item, index) => (
          <ArrayItem
            key={isObject(item) ? headingOf(item, JSON.stringify(item)) : String(item)}
            item={item}
            index={index}
          />
        ))}
      </div>
    );
  }

  if (isObject(value)) {
    return <ObjectFields data={value} />;
  }

  return null;
}

export interface JsonDocumentViewProps {
  data: unknown;
}

export function JsonDocumentView({ data }: JsonDocumentViewProps) {
  if (!isObject(data)) {
    return (
      <div className="json-document">
        <Value value={data} />
      </div>
    );
  }

  const meta = isObject(data.meta) ? data.meta : null;
  const sections = Object.entries(data).filter(([key]) => key !== "meta");

  return (
    <div className="json-document">
      {meta && (
        <header className="json-meta">
          <ObjectFields data={meta} />
        </header>
      )}

      {sections.map(([key, value]) => (
        <section key={key} className="json-section">
          <h2 id={anchorOf(key)}>{humanize(key)}</h2>
          <Value value={value} />
        </section>
      ))}
    </div>
  );
}

export default JsonDocumentView;
