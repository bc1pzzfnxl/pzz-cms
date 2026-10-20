/**
 * MDXEditor's rich-text paste inserts plain text, and its Markdown serializer
 * escapes a pasted tag (`\<Verse reference\="…">`). The MDX compiler then sees
 * text, not a component.
 *
 * The editor now intercepts pasted component tags and inserts them through
 * `insertMarkdown`, so the JSX parser handles them. This helper is the safety
 * net for tags that were typed or escaped another way: it unescapes only known
 * components, never arbitrary HTML.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeMdxJsx(source: string, names: readonly string[]): string {
  if (names.length === 0) return source;

  const namesPattern = names.map(escapeRegExp).join("|");
  const tag = new RegExp(`\\\\<\\s*(/?)\\s*(${namesPattern})\\b([^>]*)>`, "g");

  return source
    .replace(tag, (_match, closing: string, name: string, attrs: string) => {
      const cleanAttrs = attrs.replace(/\\=/g, "=").replace(/\\"/g, '"');
      return `<${closing}${name}${cleanAttrs}>`;
    })
    .replace(/^&#x20; ?/gm, "");
}
