import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Header } from "@/components/header";
import { BlogToolbar } from "@/components/blog/blog-toolbar";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { LanguageFlags } from "@/components/blog/language-flags";
import { getDocument, getDocuments } from "@/lib/documents";
import {
  documentLanguages,
  formatDocumentDate,
  getDocumentHref,
  isDocumentLanguage,
  slugifyHeading,
} from "@/lib/document-language";
import styles from "../blog.module.css";

type DocumentPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export function generateStaticParams() {
  return getDocuments().map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params, searchParams }: DocumentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  const requestedLanguage = Array.isArray(lang) ? lang[0] : lang;
  const document = getDocument(slug, isDocumentLanguage(requestedLanguage) ? requestedLanguage : undefined);
  return document
    ? {
        title: `${document.title} | Thanh`,
        description: document.summary,
        alternates: {
          languages: Object.fromEntries(
            document.languages.map((language) => [language, getDocumentHref(slug, language)]),
          ),
        },
      }
    : { title: "Document not found | Thanh" };
}

export default async function DocumentPage({ params, searchParams }: DocumentPageProps) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const requestedLanguage = Array.isArray(lang) ? lang[0] : lang;
  const language = isDocumentLanguage(requestedLanguage) ? requestedLanguage : undefined;
  const document = getDocument(slug, language);

  if (!document) notFound();

  const documentLanguage = document.language;
  const documents = getDocuments(document.language);
  const relatedSlugs = Array.from(new Set([...document.connections, ...document.backlinks]));
  const related = relatedSlugs
    .map((relatedSlug) => documents.find((item) => item.slug === relatedSlug))
    .filter((item) => item !== undefined);
  const headings = Array.from(document.content.matchAll(/^##\s+(.+)$/gm), (match) => ({
    label: match[1],
    id: slugifyHeading(match[1]),
  }));
  const copy = document.language === "vi"
    ? {
        allDocuments: "Tất cả bài viết",
        collection: "Trong tuyển tập này",
        navigation: "Các bài viết",
        minutes: "phút đọc",
        connections: "liên kết",
        continue: "Đọc tiếp trong đồ thị",
        connected: "Bài viết liên quan",
        onThisPage: "Trong bài viết",
      }
    : {
        allDocuments: "All documents",
        collection: "In this collection",
        navigation: "Blog documents",
        minutes: "min read",
        connections: "connections",
        continue: "Continue through the graph",
        connected: "Connected documents",
        onThisPage: "On this page",
      };

  function localizeInternalHref(href: string): string {
    const [path, hash] = href.split("#");
    const targetSlug = path.replace("/blog/", "").split("?")[0];
    const localizedPath = getDocumentHref(targetSlug, documentLanguage);
    return hash ? `${localizedPath}#${hash}` : localizedPath;
  }

  return (
    <main className={styles.blogRoot}>
      <Header />
      <BlogToolbar activeMode="documents" language={document.language} />
      <div className={styles.readerLayout}>
        <aside className={styles.readerCollection}>
          <Link className={styles.backToCollection} href="/blog">
            <ArrowLeft size={15} /> {copy.allDocuments}
          </Link>
          <p className={styles.railLabel}>{copy.collection}</p>
          <nav aria-label={copy.navigation}>
            {documents.map((item) => (
              <Link
                className={item.slug === document.slug ? styles.readerDocumentActive : ""}
                href={getDocumentHref(item.slug, item.language)}
                key={item.slug}
              >
                <span className={styles[item.category.toLowerCase()]} />
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className={styles.readerArticle} lang={document.language}>
          <header className={styles.documentHeader}>
            <div className={styles.documentTopline}>
              <span className={`${styles.categoryName} ${styles[document.category.toLowerCase()]}`}>
                {document.category}
              </span>
              <LanguageFlags languages={document.languages} />
            </div>
            <h1>{document.title}</h1>
            <p>{document.summary}</p>
            <div className={styles.documentMeta}>
              <time dateTime={document.publishedAt}>{formatDocumentDate(document.publishedAt, document.language)}</time>
              <span>{document.readingMinutes} {copy.minutes}</span>
              <span>{related.length} {copy.connections}</span>
            </div>
            <nav className={styles.languageSwitch} aria-label="Language versions">
              {document.languages.map((availableLanguage) => (
                <Link
                  className={availableLanguage === document.language ? styles.languageActive : ""}
                  href={getDocumentHref(document.slug, availableLanguage)}
                  hrefLang={availableLanguage}
                  key={availableLanguage}
                >
                  <span aria-hidden="true">{documentLanguages[availableLanguage].flag}</span>
                  {documentLanguages[availableLanguage].label}
                </Link>
              ))}
            </nav>
          </header>

          <div className={styles.markdownBody}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: () => null,
                h2: ({ children }) => {
                  const id = slugifyHeading(String(children));
                  return <h2 id={id}>{children}</h2>;
                },
                a: ({ href = "", children }) =>
                  href.startsWith("/blog/") ? (
                    <Link href={localizeInternalHref(href)}>{children}</Link>
                  ) : (
                    <a href={href} rel="noreferrer" target="_blank">{children}</a>
                  ),
              }}
            >
              {document.content}
            </ReactMarkdown>
          </div>

          {related.length ? (
            <footer className={styles.documentFooter}>
              <h2>{copy.continue}</h2>
              <div>
                {related.map((item) => (
                  <Link href={getDocumentHref(item.slug, item.language)} key={item.slug}>
                    <span>{item.category}</span>
                    <strong>{item.title}</strong>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </footer>
          ) : null}
        </article>

        <aside className={styles.contextRail}>
          {headings.length ? <TableOfContents items={headings} label={copy.onThisPage} /> : null}

          <div className={styles.connectionList}>
            <p className={styles.railLabel}>{copy.connected}</p>
            {related.map((item) => (
              <Link href={getDocumentHref(item.slug, item.language)} key={item.slug}>
                <span className={styles[item.category.toLowerCase()]} />
                {item.title}
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
