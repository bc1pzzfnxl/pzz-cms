import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type VerseProps = {
  /** Human-readable reference, e.g. "Jean 3:16" or "Psaume 12:2". */
  reference: string;
  /** Translation or manuscript siglum, e.g. "LSG", "BDS", "TM", "LXX". */
  version?: string;
  /** Original-language text, shown above the translation. */
  original?: string;
  /** Label for the original text, e.g. "Hébreu" or "Grec". */
  originalLabel?: string;
  /** Optional link for the reference. */
  href?: string;
  /** Markdown. The verse text. */
  children?: ReactNode;
  className?: string;
};

/**
 * A scripture quotation with its reference.
 *
 * ```mdx
 * <Verse reference="Jean 3:16" version="LSG">
 *   Car Dieu a tant aimé le monde qu'il a donné son Fils unique…
 * </Verse>
 * ```
 *
 * With the original text:
 *
 * ```mdx
 * <Verse
 *   reference="Psaume 12:2"
 *   version="TM"
 *   original="הוֹשִׁיעָה יְהוָה כִּי־גָמַר חָסִיד"
 *   originalLabel="Hébreu"
 * >
 *   Sauve, Éternel ! Car l'homme loyal a disparu.
 * </Verse>
 * ```
 */
function Verse({
  reference,
  version,
  original,
  originalLabel,
  href,
  children,
  className,
}: VerseProps) {
  const cite = (
    <cite className="font-medium not-italic text-foreground">{reference}</cite>
  );

  return (
    <figure
      data-verse
      className={cn(
        "my-8 border-l-2 border-graph-accent/50 pl-5 sm:pl-6",
        className,
      )}
    >
      {original ? (
        <div className="mb-4 border-b border-border pb-4">
          {originalLabel ? (
            <p className="mb-1 font-mono text-[0.7rem] tracking-[0.12em] text-graph-muted uppercase">
              {originalLabel}
            </p>
          ) : null}
          <p
            className="m-0 font-mono text-[0.95rem] leading-relaxed text-foreground/80"
            data-no-reveal
            dir="auto"
          >
            {original}
          </p>
        </div>
      ) : null}

      <blockquote
        className={cn(
          "verse-text m-0 border-0 bg-transparent p-0 text-[1.05rem] leading-relaxed text-foreground",
          "[&_p]:m-0",
          "[&_strong]:inline [&_strong]:text-inherit",
          "[&_em]:m-0 [&_em]:inline [&_em]:text-[1em] [&_em]:text-inherit [&_em]:italic",
        )}
      >
        {children}
      </blockquote>

      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-2 text-xs text-graph-muted">
        {href ? (
          <a
            className="underline decoration-border underline-offset-4 hover:bg-transparent hover:text-foreground"
            href={href}
          >
            {cite}
          </a>
        ) : (
          cite
        )}
        {version ? <span>· {version}</span> : null}
      </figcaption>
    </figure>
  );
}

export type { VerseProps };
export { Verse };
