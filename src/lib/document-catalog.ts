import type { BlogDocument, DocumentLanguage } from "./documents";

export type BlogListDocument = Pick<
  BlogDocument,
  | "slug"
  | "language"
  | "languages"
  | "title"
  | "part"
  | "summary"
  | "category"
  | "tags"
  | "publishedAt"
  | "readingMinutes"
> & {
  connectionCount: number;
};

export type DocumentSearchIndex = Record<string, string>;

export type GraphDocument = Pick<
  BlogDocument,
  | "slug"
  | "language"
  | "languages"
  | "title"
  | "part"
  | "summary"
  | "category"
  | "tags"
  | "connections"
  | "backlinks"
>;

export function createBlogListDocuments(
  documents: BlogDocument[],
): BlogListDocument[] {
  return documents.map((document) => ({
    slug: document.slug,
    language: document.language,
    languages: document.languages,
    title: document.title,
    part: document.part,
    summary: document.summary,
    category: document.category,
    tags: document.tags,
    publishedAt: document.publishedAt,
    readingMinutes: document.readingMinutes,
    connectionCount: document.connections.length,
  }));
}

export function createDocumentSearchIndex(
  documents: BlogDocument[],
): DocumentSearchIndex {
  return Object.fromEntries(
    documents.map((document) => [
      document.slug,
      `${document.part ?? ""} ${document.title} ${document.summary} ${document.content} ${document.tags.join(" ")}`.toLowerCase(),
    ]),
  );
}

export function createGraphDocuments(
  documents: BlogDocument[],
): GraphDocument[] {
  return documents.map((document) => ({
    slug: document.slug,
    language: document.language,
    languages: document.languages,
    title: document.title,
    part: document.part,
    summary: document.summary,
    category: document.category,
    tags: document.tags,
    connections: document.connections,
    backlinks: document.backlinks,
  }));
}

export function getDocumentSearchIndexHref(
  language: DocumentLanguage,
): string {
  return `/blog/search-index/${language}`;
}

export function getDocumentPreviewHref(
  slug: string,
  language: DocumentLanguage,
): string {
  return `/blog/document-preview/${language}/${slug}`;
}
