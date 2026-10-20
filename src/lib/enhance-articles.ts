/**
 * Client-side enhancement for article components. The markup is static (SEO,
 * no JS); this adds motion when the page loads. Loaded by MainLayout.
 *
 * Motion is always on, even when the OS reports `prefers-reduced-motion`
 * (a deliberate choice: the effects are lightweight). See PLAN.md, P8.
 */
import { splitText } from "kugiri";
import { formatNumber, type NumberFormat } from "./format-number";

function enhanceStats(): void {
  for (const el of document.querySelectorAll<HTMLElement>("[data-stat]")) {
    if (el.dataset.enhanced) continue;
    el.dataset.enhanced = "1";

    const target = Number(el.dataset.value ?? "");
    const valueEl = el.querySelector<HTMLElement>(".mdx-stat-value");
    if (!valueEl || !Number.isFinite(target)) continue;

    const options = {
      format: (el.dataset.format as NumberFormat | undefined) ?? "plain",
      currency: el.dataset.currency || undefined,
      locale: el.dataset.locale || undefined,
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const start = performance.now();
        const duration = 900;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - t) ** 3;
          valueEl.textContent = formatNumber(target * eased, options);
          if (t < 1) requestAnimationFrame(tick);
          else valueEl.textContent = formatNumber(target, options);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
  }
}

/**
 * Reveal precompiled mdxcn components (Callout, Steps, GraphTable, ...). Their
 * static HTML carries a `data-mdx-reveal` marker instead of motion's hidden
 * style; this fades the block in on scroll. Always on, like the rest of the
 * article motion.
 */
function enhanceMdxReveals(): void {
  const targets = [...document.querySelectorAll<HTMLElement>("[data-mdx-reveal]")].filter(
    (el) => !el.dataset.enhanced,
  );
  if (targets.length === 0) return;

  for (const el of targets) el.dataset.enhanced = "1";
  document.documentElement.dataset.enhance = "on";

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealed = "";
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15 },
  );
  for (const el of targets) observer.observe(el);
}

function enhanceReveals(): void {
  const targets = [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
    (el) => !el.dataset.enhanced,
  );
  if (targets.length === 0) return;

  for (const el of targets) el.dataset.enhanced = "1";

  // Scope the "hidden until revealed" CSS to JS-enabled pages, so the text
  // stays visible without JS.
  document.documentElement.dataset.enhance = "on";
  splitText(targets, { type: ["words"], mask: "words" });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealed = "";
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.4 },
  );
  for (const el of targets) observer.observe(el);
}

/**
 * Reveal an article's headings and paragraphs word by word on scroll. The text
 * is in the markup; this only adds motion. Opt out per block with `<Reveal>`.
 */
function enhanceArticle(): void {
  const root = document.querySelector<HTMLElement>("[data-reveal-article]");
  if (!root || root.dataset.enhanced) return;

  const targets = [...root.querySelectorAll<HTMLElement>("h2, h3, p")].filter(
    (el) =>
      (el.textContent ?? "").trim().length > 0 &&
      !el.closest("[data-reveal]") &&
      !el.querySelector("[data-reveal]"),
  );
  if (targets.length === 0) return;

  root.dataset.enhanced = "1";
  document.documentElement.dataset.enhance = "on";
  splitText(targets, { type: ["words"], mask: "words" });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealed = "";
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15 },
  );
  for (const el of targets) observer.observe(el);
}

function run(): void {
  enhanceStats();
  enhanceMdxReveals();
  enhanceReveals();
  enhanceArticle();
}

// Astro's ClientRouter swaps the body without reloading scripts, so the
// enhancer must run again after each navigation. `astro:page-load` also fires
// on the first load; the per-target guards keep the work idempotent.
document.addEventListener("astro:page-load", run);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run, { once: true });
} else {
  run();
}
