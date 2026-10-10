/**
 * Site-level configuration. This is the single place where branding, the
 * canonical URL and the default metadata live. The blog (bc1pzzfnxl-blog)
 * overrides these values; the CMS itself stays generic.
 */
export interface SiteConfig {
  /** Short site name, used in the `<title>` suffix and the header. */
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
  name: "bc1pzzfnxl",
  url: "https://bc1pzzfnxl.com",
  description: "Blog perso | Théologie Chrétienne et Juive | Pensée personnelle",
  tagline: "Théologie biblique, exégèse et pensée personnelle.",
  locale: "fr",
  logo: "https://bc1pzzfnxl.com/logo.png",
  defaultCover: "https://bc1pzzfnxl.com/images/default-cover.webp",
  author: {
    name: "bc1pzzfnxl",
    url: "https://bc1pzzfnxl.com",
    bio: "Auteur du blog bc1pzzfnxl : théologie biblique, exégèse et pensée personnelle.",
    sameAs: [],
  },
};
