import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FigureProps = {
  /** Media path from the admin (`/media/images/…/`) or an absolute URL. */
  src: string;
  /** Alternative text. Required for accessibility; empty for decorative images. */
  alt: string;
  /** Visible caption, under the image. */
  caption?: ReactNode;
  /** Source or credit line, under the caption. */
  credit?: ReactNode;
  /** Optional link around the image. */
  href?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
};

/**
 * An image with a caption and an optional credit.
 *
 * ```mdx
 * <Figure
 *   src="/media/images/ninive.webp/"
 *   alt="Bas-relief de Ninive"
 *   caption="Bas-relief assyrien représentant la prise de Ninive."
 *   credit="Source : British Museum"
 * />
 * ```
 *
 * `optimizeBodyImages` adds the intrinsic dimensions and lazy loading from the
 * media table for `/media/` paths; explicit `width`/`height` win for external
 * images.
 */
function Figure({ src, alt, caption, credit, href, width, height, className }: FigureProps) {
  const image = (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className="m-0 h-auto w-full rounded-lg"
    />
  );

  return (
    <figure data-figure className={cn("my-8", className)}>
      {href ? (
        <a className="block no-underline hover:bg-transparent" href={href} rel="noreferrer">
          {image}
        </a>
      ) : (
        image
      )}

      {caption || credit ? (
        <figcaption className="mt-3 flex flex-col items-center gap-1 text-center">
          {caption ? (
            <span className="text-[0.85rem] leading-relaxed text-foreground/80">{caption}</span>
          ) : null}
          {credit ? <span className="text-[0.75rem] text-graph-muted">{credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

export type { FigureProps };
export { Figure };
