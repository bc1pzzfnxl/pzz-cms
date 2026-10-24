import type { SiteConfig } from "./site";

/** Absolute URL for a path, given the site origin. */
export function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin).href;
}

/** Schema.org WebSite for the home page. */
export function websiteSchema(site: SiteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: site.locale,
    publisher: {
      "@type": "Person",
      name: site.author.name,
      url: site.author.url,
      image: site.logo,
      logo: { "@type": "ImageObject", url: site.logo },
    },
  };
}

export interface BlogPostingInput {
  title: string;
  description: string;
  url: string;
  image: string;
  locale: string;
  publishedAt: string | null;
  modifiedAt: string | null;
  author: { name: string; url: string };
  publisher: { name: string; url: string; logo: string };
}

/** Schema.org BlogPosting for an article. */
export function blogPostingSchema(input: BlogPostingInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    image: [input.image],
    url: input.url,
    inLanguage: input.locale,
    author: {
      "@type": "Person",
      name: input.author.name,
      url: input.author.url,
    },
    publisher: {
      "@type": "Person",
      name: input.publisher.name,
      url: input.publisher.url,
      logo: { "@type": "ImageObject", url: input.publisher.logo },
    },
    datePublished: input.publishedAt,
    dateModified: input.modifiedAt ?? input.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  };
}

/** Schema.org BreadcrumbList: home, then the current page. */
export function breadcrumbSchema(site: SiteConfig, title: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: site.name,
        item: site.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: url,
      },
    ],
  };
}

export interface CollectionPageInput {
  name: string;
  description: string;
  url: string;
  locale: string;
  articles: { title: string; url: string }[];
}

/** Schema.org CollectionPage with an ItemList, for a category page. */
export function collectionPageSchema(input: CollectionPageInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.locale,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: input.articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: article.title,
        url: article.url,
      })),
    },
  };
}

/** Schema.org Person for the author page. */
export function personSchema(site: SiteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.author.name,
    url: site.author.url,
    description: site.author.bio,
    sameAs: site.author.sameAs,
  };
}

export interface CreativeWorkInput {
  title: string;
  description: string;
  url: string;
  locale: string;
  publishedAt: string | null;
  modifiedAt: string | null;
  author: { name: string; url: string };
}

/** Schema.org CreativeWork for a JSON document page. */
export function creativeWorkSchema(input: CreativeWorkInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: input.title,
    description: input.description,
    url: input.url,
    inLanguage: input.locale,
    author: {
      "@type": "Person",
      name: input.author.name,
      url: input.author.url,
    },
    datePublished: input.publishedAt,
    dateModified: input.modifiedAt ?? input.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  };
}
