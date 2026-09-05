"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Graph, Sparkle } from "@phosphor-icons/react";
import type { BlogDocument, DocumentCategory } from "@/lib/documents";
import { BlogToolbar } from "./blog-toolbar";
import styles from "@/app/blog/blog.module.css";

const categories: Array<"All" | DocumentCategory> = [
  "All",
  "Personal",
  "Technical",
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function BlogCollection({ documents }: { documents: BlogDocument[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("[data-blog-search]")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesCategory =
        category === "All" || document.category === category;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${document.title} ${document.summary} ${document.content}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, documents, query]);

  const featured = documents[0];

  return (
    <>
      <BlogToolbar
        activeMode="documents"
        query={query}
        onQueryChange={setQuery}
      />
      <div className={styles.collectionPage}>
        <aside className={styles.collectionRail} aria-label="Document filters">
          <div>
            <p className={styles.railLabel}>Browse by category</p>
            <div className={styles.categoryStack}>
              {categories.map((item) => (
                <button
                  className={category === item ? styles.categoryActive : ""}
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                >
                  <span>{item}</span>
                  <small>
                    {item === "All"
                      ? documents.length
                      : documents.filter(
                          (document) => document.category === item,
                        ).length}
                  </small>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.graphInvitation}>
            <Graph size={23} weight="light" aria-hidden="true" />
            <p>See how these ideas connect.</p>
            <Link href="/blog/graph">Open graph</Link>
          </div>
        </aside>

        <section className={styles.collectionMain} aria-labelledby="blog-title">
          <header className={styles.collectionHero}>
            <div>
              <p className={styles.heroKicker}>
                Notes on building and noticing
              </p>
              <h1 id="blog-title">Ideas are more useful when they connect.</h1>
            </div>
          </header>

          {query.length === 0 && category === "All" && featured ? (
            <Link
              className={styles.featuredDocument}
              href={`/blog/${featured.slug}`}
            >
              <div className={styles.featuredConstellation} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <i />
                <i />
                <i />
              </div>
              <div className={styles.featuredCopy}>
                <span
                  className={`${styles.categoryName} ${styles[featured.category.toLowerCase()]}`}
                >
                  <Sparkle size={13} weight="fill" aria-hidden="true" />
                  {featured.category}
                </span>
                <h2>{featured.title}</h2>
                <p>{featured.summary}</p>
                <small>
                  {formatDate(featured.publishedAt)}
                  <span>{featured.readingMinutes} min read</span>
                </small>
              </div>
              <ArrowUpRight
                className={styles.featuredArrow}
                size={22}
                aria-hidden="true"
              />
            </Link>
          ) : null}

          <div className={styles.collectionHeading}>
            <h2>
              {query
                ? `Results for “${query}”`
                : category === "All"
                  ? "All documents"
                  : category}
            </h2>
            <span>{filtered.length} documents</span>
          </div>

          {filtered.length > 0 ? (
            <div className={styles.documentList}>
              {filtered.map((document) => (
                <Link
                  className={styles.documentRow}
                  href={`/blog/${document.slug}`}
                  key={document.slug}
                >
                  <div>
                    <span
                      className={`${styles.categoryMark} ${styles[document.category.toLowerCase()]}`}
                    >
                      {document.category}
                    </span>
                    <h3>{document.title}</h3>
                    <p>{document.summary}</p>
                  </div>
                  <div className={styles.rowMeta}>
                    <time dateTime={document.publishedAt}>
                      {formatDate(document.publishedAt)}
                    </time>
                    <span>{document.connections.length} connections</span>
                  </div>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyOrbit} aria-hidden="true" />
              <h2>No documents found</h2>
              <p>Try another phrase or include both categories.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
              >
                Reset filters
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
