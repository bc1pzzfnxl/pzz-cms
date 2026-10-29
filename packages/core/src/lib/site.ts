/**
 * Site configuration. This is the single place where branding, the canonical
 * URL and the default metadata live. Replace these values with your own; the
 * engine reads them everywhere (layout, SEO, admin).
 */
export interface SiteConfig {
  /** Short site name, used in the `<title>` suffix, the header and the admin. */
  name: string;
  /** Canonical origin, no trailing slash. */
  url: string;
  /** Default meta description, used when a page provides none. */
  description: string;
  /** Home page title suffix. */
  tagline: string;
  /** BCP 47 language tag for `<html lang>` and JSON-LD `inLanguage`. */
  locale: string;
  /** Public path to the publisher logo (JSON-LD). */
  logo: string;
  /** Public path to the fallback Open Graph image. */
  defaultCover: string;
  /** Site author, used in JSON-LD and the author page. */
  author: {
    name: string;
    url: string;
    /** Short biography for the author page and E-E-A-T signals. */
    bio: string;
    /** Verified profiles, used as `sameAs` in Schema.org. */
    sameAs: string[];
  };
}

export const site: SiteConfig = {
  name: "Example",
  url: "https://example.com",
  description: "A short description of the site, used as the default meta description.",
  tagline: "A tagline shown next to the site name on the home page.",
  locale: "en",
  logo: "https://example.com/logo.png",
  defaultCover: "https://example.com/images/default-cover.webp",
  author: {
    name: "Your name",
    url: "https://example.com",
    bio: "A short biography for the author page.",
    sameAs: [],
  },
};
