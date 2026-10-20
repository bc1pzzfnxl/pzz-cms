/**
 * Static MDX rendering helpers.
 *
 * mdxcn components use `motion` and default to `initial="hidden"`. When the
 * admin precompiles MDX with `renderToStaticMarkup`, that initial state is
 * written into the HTML as `opacity:0;transform:translateY(8px)`. The public
 * page has no React hydration, so the content would stay invisible forever.
 *
 * We strip that hidden state, mark the element, and let `enhance-articles`
 * reveal it on scroll. Without JS the content stays visible: motion is
 * progressive enhancement, never a requirement to read the article.
 */
const HIDDEN_OPACITY = /(?:^|;)\s*opacity:\s*0\s*(?=;|$)/;
const HIDDEN_TRANSFORM = /(?:^|;)\s*transform:\s*translateY\(8px\)\s*(?=;|$)/;

function stripHiddenStyle(style: string): string | null {
  if (!HIDDEN_OPACITY.test(style) || !HIDDEN_TRANSFORM.test(style)) return null;

  const kept = style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter(
      (part) => !/^opacity:\s*0$/.test(part) && !/^transform:\s*translateY\(8px\)$/.test(part),
    );

  return kept.join(";");
}

/**
 * Turn motion's precompiled hidden state into a `data-mdx-reveal` marker.
 * Idempotent: HTML that already carries the marker is returned unchanged.
 */
export function prepareMdxHtml(html: string): string {
  return html.replace(/\sstyle="([^"]*)"/g, (match, style: string) => {
    const cleaned = stripHiddenStyle(style);
    if (cleaned === null) return match;

    const styleAttr = cleaned ? ` style="${cleaned}"` : "";
    return `${styleAttr} data-mdx-reveal=""`;
  });
}
