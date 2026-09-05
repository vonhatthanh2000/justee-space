import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type DocumentCategory = "Personal" | "Technical";

export type BlogDocument = {
  slug: string;
  title: string;
  summary: string;
  category: DocumentCategory;
  publishedAt: string;
  updatedAt?: string;
  draft: boolean;
  content: string;
  excerpt: string;
  connections: string[];
  backlinks: string[];
  unresolvedReferences: string[];
  readingMinutes: number;
};

const documentsDirectory = path.join(process.cwd(), "content", "documents");
const internalLinkPattern = /\]\(\/blog\/([a-z0-9-]+)(?:#[^)]+)?\)/g;

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

function parseDocument(
  filename: string,
): Omit<BlogDocument, "backlinks" | "unresolvedReferences"> {
  const slug = filename.replace(/\.md$/, "");
  const source = fs.readFileSync(path.join(documentsDirectory, filename), "utf8");
  const { data, content } = matter(source);
  const category = assertString(data.category, "category", filename);

  if (category !== "Personal" && category !== "Technical") {
    throw new Error(`${filename}: category must be Personal or Technical.`);
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
    title: assertString(data.title, "title", filename),
    summary: assertString(data.summary, "summary", filename),
    category,
    publishedAt: assertDate(data.publishedAt, "publishedAt", filename),
    updatedAt: data.updatedAt ? assertDate(data.updatedAt, "updatedAt", filename) : undefined,
    draft: data.draft === true,
    content,
    excerpt: plainText.split(" ").slice(0, 110).join(" "),
    connections,
    readingMinutes: Math.max(1, Math.ceil(plainText.split(" ").length / 220)),
  };
}

export function getDocuments(): BlogDocument[] {
  const parsed = fs
    .readdirSync(documentsDirectory)
    .filter((filename) => filename.endsWith(".md"))
    .map(parseDocument)
    .filter((document) => process.env.NODE_ENV !== "production" || !document.draft);

  const slugs = new Set(parsed.map((document) => document.slug));

  return parsed
    .map((document) => ({
      ...document,
      connections: document.connections,
      backlinks: parsed
        .filter((candidate) => candidate.connections.includes(document.slug))
        .map((candidate) => candidate.slug),
      unresolvedReferences: document.connections.filter((slug) => !slugs.has(slug)),
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getDocument(slug: string): BlogDocument | undefined {
  return getDocuments().find((document) => document.slug === slug);
}

export function formatDocumentDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
