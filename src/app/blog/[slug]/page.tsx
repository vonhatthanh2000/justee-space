import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Header } from "@/components/header";
import { BlogToolbar } from "@/components/blog/blog-toolbar";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { formatDocumentDate, getDocument, getDocuments } from "@/lib/documents";
import styles from "../blog.module.css";

type DocumentPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getDocuments().map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: DocumentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getDocument(slug);
  return document
    ? { title: `${document.title} | Thanh`, description: document.summary }
    : { title: "Document not found | Thanh" };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { slug } = await params;
  const document = getDocument(slug);

  if (!document) notFound();

  const documents = getDocuments();
  const relatedSlugs = Array.from(new Set([...document.connections, ...document.backlinks]));
  const related = relatedSlugs
    .map((relatedSlug) => documents.find((item) => item.slug === relatedSlug))
    .filter((item) => item !== undefined);
  const headings = Array.from(document.content.matchAll(/^##\s+(.+)$/gm), (match) => ({
    label: match[1],
    id: match[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  }));

  return (
    <main className={styles.blogRoot}>
      <Header />
      <BlogToolbar activeMode="documents" />
      <div className={styles.readerLayout}>
        <aside className={styles.readerCollection}>
          <Link className={styles.backToCollection} href="/blog">
            <ArrowLeft size={15} /> All documents
          </Link>
          <p className={styles.railLabel}>In this collection</p>
          <nav aria-label="Blog documents">
            {documents.map((item) => (
              <Link
                className={item.slug === document.slug ? styles.readerDocumentActive : ""}
                href={`/blog/${item.slug}`}
                key={item.slug}
              >
                <span className={styles[item.category.toLowerCase()]} />
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className={styles.readerArticle}>
          <header className={styles.documentHeader}>
            <span className={`${styles.categoryName} ${styles[document.category.toLowerCase()]}`}>
              {document.category}
            </span>
            <h1>{document.title}</h1>
            <p>{document.summary}</p>
            <div>
              <time dateTime={document.publishedAt}>{formatDocumentDate(document.publishedAt)}</time>
              <span>{document.readingMinutes} min read</span>
              <span>{related.length} connections</span>
            </div>
          </header>

          <div className={styles.markdownBody}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: () => null,
                h2: ({ children }) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                  return <h2 id={id}>{children}</h2>;
                },
                a: ({ href = "", children }) =>
                  href.startsWith("/blog/") ? (
                    <Link href={href}>{children}</Link>
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
              <h2>Continue through the graph</h2>
              <div>
                {related.map((item) => (
                  <Link href={`/blog/${item.slug}`} key={item.slug}>
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
          {headings.length ? <TableOfContents items={headings} /> : null}

          <div className={styles.connectionList}>
            <p className={styles.railLabel}>Connected documents</p>
            {related.map((item) => (
              <Link href={`/blog/${item.slug}`} key={item.slug}>
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
