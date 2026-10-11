import type { ReactNode } from "react";

export interface RevealProps {
  children?: ReactNode;
}

/**
 * Text that reveals word by word when it scrolls into view. The text is in the
 * markup (SEO, no JS); `enhance-articles` splits it with kugiri and reveals it.
 * See PLAN.md, P8.
 */
export function Reveal({ children }: RevealProps) {
  return (
    <span className="mdx-reveal" data-reveal>
      {children}
    </span>
  );
}
