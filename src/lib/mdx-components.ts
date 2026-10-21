import { Callout } from "@/components/callout";
import { Faq } from "@/components/faq";
import { Figure } from "@/components/figure";
import { GraphCompare } from "@/components/graph-compare";
import { GraphStat } from "@/components/graph-stat";
import { GraphTable } from "@/components/graph-table";
import { GraphTimeline } from "@/components/graph-timeline";
import { Reveal } from "@/components/mdx/reveal";
import { Stat } from "@/components/mdx/stat";
import { Quote } from "@/components/quote";
import { Steps } from "@/components/steps";
import { Terminal } from "@/components/terminal";
import { Verse } from "@/components/verse";
import type { MdxComponents } from "./render-mdx";

/**
 * Components available inside article MDX. Used when the admin compiles MDX to
 * HTML. This is a curated subset of mdxcn (https://mdxcn.dev), not the full
 * library.
 */
export const mdxComponents = {
  Callout,
  Faq,
  Figure,
  GraphCompare,
  GraphStat,
  GraphTable,
  GraphTimeline,
  Quote,
  Reveal,
  Stat,
  Steps,
  Terminal,
  Verse,
} as unknown as MdxComponents;
