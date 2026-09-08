import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  defaultDocumentLanguage,
  type DocumentLanguage,
} from "./document-language";

export type DocumentCategory = "Personal" | "Technical";
export type { DocumentLanguage } from "./document-language";

export type BlogDocument = {
  slug: string;
  language: DocumentLanguage;
  languages: DocumentLanguage[];
  title: string;
  part?: string;
  summary: string;
  category: DocumentCategory;
  tags: string[];
  publishedAt: string;
  updatedAt?: string;
  draft: boolean;
  content: string;
  excerpt: string;
  previewContent: string;
  connections: string[];
  backlinks: string[];
  unresolvedReferences: string[];
  readingMinutes: number;
};

type ParsedDocument = Omit<BlogDocument, "languages" | "backlinks" | "unresolvedReferences">;

const documentsDirectory = path.join(process.cwd(), "content", "documents");
const internalLinkPattern = /\]\(\/blog\/([a-z0-9-]+)(?:[?#][^)]+)?\)/g;
const languageDirectories: Record<DocumentLanguage, string> = {
  vi: "vietnamese",
  en: "english",
};

function createMarkdownPreview(content: string, wordLimit = 330): string {
  const blocks = content.trim().split(/\n{2,}/);
  const preview: string[] = [];
  let words = 0;

  for (const block of blocks) {
    const blockWords = block.trim().split(/\s+/).length;
    if (preview.length > 0 && words + blockWords > wordLimit) break;
    preview.push(block);
    words += blockWords;
  }

  return preview.join("\n\n");
}

function assertString(value: unknown, field: string, filename: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${filename}: frontmatter field "${field}" must be a non-empty string.`);
  }

  return value.trim();
}

function assertDate(value: unknown, field: string, filename: string): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }

  return assertString(value, field, filename);
}

function assertTags(value: unknown, filename: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      `${filename}: frontmatter field "tags" must be a non-empty array.`,
    );
  }

  const tags = value.map((tag, index) =>
    assertString(tag, `tags[${index}]`, filename).toLowerCase(),
  );

  if (tags.some((tag) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag))) {
    throw new Error(
      `${filename}: tags must use lowercase letters, numbers, and single hyphens.`,
    );
  }

  if (new Set(tags).size !== tags.length) {
    throw new Error(`${filename}: tags must not contain duplicates.`);
  }

  return tags;
}

function parseDocument(filename: string, language: DocumentLanguage): ParsedDocument {
  const slug = filename.replace(/\.md$/, "");
  const relativePath = path.join(languageDirectories[language], filename);
  const source = fs.readFileSync(path.join(documentsDirectory, relativePath), "utf8");
  const { data, content } = matter(source);
  const category = assertString(data.category, "category", relativePath);

  if (category !== "Personal" && category !== "Technical") {
    throw new Error(`${relativePath}: category must be Personal or Technical.`);
  }

  const connections = Array.from(content.matchAll(internalLinkPattern), (match) => match[1]).filter(
    (target, index, all) => target !== slug && all.indexOf(target) === index,
  );
  const plainText = content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    slug,
    language,
    title: assertString(data.title, "title", relativePath),
    part:
      data.part === undefined
        ? undefined
        : assertString(data.part, "part", relativePath),
    summary: assertString(data.summary, "summary", relativePath),
    category,
    tags: assertTags(data.tags, relativePath),
    publishedAt: assertDate(data.publishedAt, "publishedAt", relativePath),
    updatedAt: data.updatedAt ? assertDate(data.updatedAt, "updatedAt", relativePath) : undefined,
    draft: data.draft === true,
    content,
    excerpt: plainText.split(" ").slice(0, 330).join(" "),
    previewContent: createMarkdownPreview(content),
    connections,
    readingMinutes: Math.max(1, Math.ceil(plainText.split(" ").length / 220)),
  };
}

function getParsedDocuments(): ParsedDocument[] {
  return (Object.entries(languageDirectories) as [DocumentLanguage, string][])
    .flatMap(([language, directory]) =>
      fs
        .readdirSync(path.join(documentsDirectory, directory))
        .filter((filename) => filename.endsWith(".md"))
        .map((filename) => parseDocument(filename, language)),
    )
    .filter((document) => process.env.NODE_ENV !== "production" || !document.draft);
}

export function getDocuments(
  preferredLanguage: DocumentLanguage = defaultDocumentLanguage,
): BlogDocument[] {
  const parsed = getParsedDocuments();
  const bySlug = new Map<string, ParsedDocument[]>();

  for (const document of parsed) {
    const versions = bySlug.get(document.slug) ?? [];
    if (versions.some((version) => version.language === document.language)) {
      throw new Error(`${document.slug}: duplicate ${document.language} translation.`);
    }
    versions.push(document);
    bySlug.set(document.slug, versions);
  }

  for (const [slug, versions] of bySlug) {
    const [source, ...translations] = versions;
    for (const translation of translations) {
      if (translation.tags.join("\0") !== source.tags.join("\0")) {
        throw new Error(
          `${slug}: translations must use identical tags in the same order.`,
        );
      }
    }
  }

  const visibleSlugs = new Set(bySlug.keys());

  return Array.from(bySlug.entries())
    .map(([slug, versions]) => {
      const selected =
        versions.find((version) => version.language === preferredLanguage) ??
        versions.find((version) => version.language === "vi") ??
        versions[0];
      const languages = (["vi", "en"] as DocumentLanguage[]).filter((language) =>
        versions.some((version) => version.language === language),
      );

      return {
        ...selected,
        languages,
        backlinks: parsed
          .filter((candidate) => candidate.connections.includes(slug))
          .map((candidate) => candidate.slug)
          .filter((candidate, index, all) => all.indexOf(candidate) === index),
        unresolvedReferences: selected.connections.filter((target) => !visibleSlugs.has(target)),
      };
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getDocument(
  slug: string,
  preferredLanguage: DocumentLanguage = defaultDocumentLanguage,
): BlogDocument | undefined {
  return getDocuments(preferredLanguage).find((document) => document.slug === slug);
}
