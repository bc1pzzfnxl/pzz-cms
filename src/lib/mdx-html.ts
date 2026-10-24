/**
 * Static MDX rendering helpers.
 *
 * mdxcn components use `motion` and default to `initial="hidden"`. When the
 * admin precompiles MDX with `renderToStaticMarkup`, that initial state is
 * written into the HTML as `opacity:0;transform:translateY(8px)`. The public
 * page has no React hydration, so the content would stay invisible forever.
 *
 * We strip that hidden state. The public page adds no animation: the article is
 * fully readable from the first paint, with or without JS.
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
 * Remove motion's precompiled hidden state so the article is visible without
 * JS, and drop the reveal markers stored by older article revisions. Idempotent:
 * cleaned HTML is returned unchanged.
 */
export function prepareMdxHtml(html: string): string {
  return html
    .replace(/\sstyle="([^"]*)"/g, (match, style: string) => {
      const cleaned = stripHiddenStyle(style);
      if (cleaned === null) return match;

      return cleaned ? ` style="${cleaned}"` : "";
    })
    .replace(/\sdata-mdx-reveal(?:="[^"]*")?(?=[\s>])/g, "")
    .replace(/\sdata-reveal(?:="[^"]*")?(?=[\s>])/g, "")
    .replace(/\sdata-no-reveal(?:="[^"]*")?(?=[\s>])/g, "");
}
