import type { ReactNode } from "react";

export interface RevealProps {
  children?: ReactNode;
}

/**
 * Kept for existing articles that use `<Reveal>`: it renders plain static
 * markup, with no per-word animation. Public pages add no motion.
 */
export function Reveal({ children }: RevealProps) {
  return <span className="mdx-reveal">{children}</span>;
}
