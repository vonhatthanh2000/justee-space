export type DocumentLanguage = "vi" | "en";

export const defaultDocumentLanguage: DocumentLanguage = "vi";

export const documentLanguages: Record<
  DocumentLanguage,
  { label: string; shortLabel: string; flag: string }
> = {
  vi: { label: "Tiếng Việt", shortLabel: "VI", flag: "🇻🇳" },
  en: { label: "English", shortLabel: "EN", flag: "🇬🇧" },
};

export function isDocumentLanguage(value: unknown): value is DocumentLanguage {
  return value === "vi" || value === "en";
}

export function getDocumentHref(slug: string, language: DocumentLanguage): string {
  return language === defaultDocumentLanguage
    ? `/blog/${slug}`
    : `/blog/${slug}?lang=${language}`;
}

export function getBlogHref(language: DocumentLanguage): string {
  return language === defaultDocumentLanguage ? "/blog" : `/blog?lang=${language}`;
}

export function getGraphHref(language: DocumentLanguage, document?: string): string {
  const parameters = new URLSearchParams();
  if (language !== defaultDocumentLanguage) parameters.set("lang", language);
  if (document) parameters.set("document", document);
  const query = parameters.toString();
  return query ? `/blog/graph?${query}` : "/blog/graph";
}

export function slugifyHeading(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatDocumentDate(date: string, language: DocumentLanguage = "en"): string {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
