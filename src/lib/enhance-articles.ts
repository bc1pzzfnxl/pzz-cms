/**
 * Client-side enhancement for article components. The markup is static (SEO,
 * no JS); this adds motion when the page loads. Loaded by MainLayout.
 * See PLAN.md, P8.
 */
import { splitText } from "kugiri";
import { formatNumber, type NumberFormat } from "./format-number";

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function enhanceStats(): void {
  const reduce = prefersReducedMotion();

  for (const el of document.querySelectorAll<HTMLElement>("[data-stat]")) {
    if (el.dataset.enhanced) continue;
    el.dataset.enhanced = "1";

    const target = Number(el.dataset.value ?? "");
    const valueEl = el.querySelector<HTMLElement>(".mdx-stat-value");
    if (!valueEl || !Number.isFinite(target) || reduce) continue;

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

function enhanceReveals(): void {
  const reduce = prefersReducedMotion();
  const targets = [...document.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
    (el) => !el.dataset.enhanced,
  );
  if (targets.length === 0) return;

  for (const el of targets) el.dataset.enhanced = "1";
  if (reduce) return;

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
  if (!root || prefersReducedMotion()) return;

  const targets = [...root.querySelectorAll<HTMLElement>("h2, h3, p")].filter(
    (el) =>
      (el.textContent ?? "").trim().length > 0 &&
      !el.closest("[data-reveal]") &&
      !el.querySelector("[data-reveal]"),
  );
  if (targets.length === 0) return;

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
  enhanceReveals();
  enhanceArticle();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
