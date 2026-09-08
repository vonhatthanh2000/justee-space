"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Graph, Sparkle } from "@phosphor-icons/react";
import type { BlogDocument, DocumentCategory } from "@/lib/documents";
import type { DocumentLanguage } from "@/lib/document-language";
import {
  documentLanguages,
  formatDocumentDate,
  getDocumentHref,
} from "@/lib/document-language";
import { BlogToolbar } from "./blog-toolbar";
import { LanguageFlags } from "./language-flags";
import styles from "@/app/blog/blog.module.css";

const categories: Array<"All" | DocumentCategory> = [
  "All",
  "Personal",
  "Technical",
];

export function BlogCollection({
  documents,
  language,
}: {
  documents: BlogDocument[];
  language: DocumentLanguage;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const document of documents) {
      for (const tag of document.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  }, [documents]);

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
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => document.tags.includes(tag));
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${document.part ?? ""} ${document.title} ${document.summary} ${document.content} ${document.tags.join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesTags && matchesQuery;
    });
  }, [category, documents, query, selectedTags]);

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  const featured = documents[0];

  return (
    <>
      <BlogToolbar
        activeMode="documents"
        query={query}
        onQueryChange={setQuery}
        language={language}
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
                  aria-pressed={category === item}
                >
                  <i
                    className={styles[item.toLowerCase()]}
                    aria-hidden="true"
                  />
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

          <div className={styles.tagFilterSection}>
            <div className={styles.tagFilterHeading}>
              <p className={styles.railLabel}>Filter by tag</p>
              {selectedTags.length > 0 ? (
                <button type="button" onClick={() => setSelectedTags([])}>
                  Clear
                </button>
              ) : null}
            </div>
            <div
              className={styles.tagStack}
              role="group"
              aria-label="Document tags"
            >
              {tags.map((tag) => (
                <button
                  className={
                    selectedTags.includes(tag.name) ? styles.tagActive : ""
                  }
                  key={tag.name}
                  type="button"
                  onClick={() => toggleTag(tag.name)}
                  aria-pressed={selectedTags.includes(tag.name)}
                >
                  <span>#{tag.name}</span>
                  <small>{tag.count}</small>
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

        <section
          className={styles.collectionMain}
          aria-labelledby="blog-title"
          lang={language}
        >
          <header className={styles.collectionHero}>
            <div>
              <p className={styles.heroKicker}>
                Notes on building and noticing
              </p>
              <h1 id="blog-title">Documents make ideas more valuable.</h1>
            </div>
            <nav
              className={`${styles.modeSwitch} ${styles.languageModeSwitch}`}
              aria-label="Choose the blog language"
            >
              {(["vi", "en"] as DocumentLanguage[]).map((option) => (
                <Link
                  className={language === option ? styles.modeActive : ""}
                  href={option === "vi" ? "/blog" : "/blog?lang=en"}
                  hrefLang={option}
                  key={option}
                  aria-current={language === option ? "page" : undefined}
                >
                  <span aria-hidden="true">{documentLanguages[option].flag}</span>
                  {documentLanguages[option].shortLabel}
                </Link>
              ))}
            </nav>
          </header>

          {query.length === 0 &&
          category === "All" &&
          selectedTags.length === 0 &&
          featured ? (
            <Link
              className={styles.featuredDocument}
              href={getDocumentHref(featured.slug, featured.language)}
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
                <LanguageFlags languages={featured.languages} />
                {featured.part ? (
                  <span className={styles.documentPart}>{featured.part}</span>
                ) : null}
                <h2 className={language === "vi" ? styles.vietnameseHeading : undefined}>
                  {featured.title}
                </h2>
                <p>{featured.summary}</p>
                <div className={styles.documentTags} aria-label="Tags">
                  {featured.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
                <small>
                  {formatDocumentDate(featured.publishedAt, featured.language)}
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
                : selectedTags.length > 0
                  ? selectedTags.map((tag) => `#${tag}`).join(", ")
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
                  href={getDocumentHref(document.slug, document.language)}
                  key={document.slug}
                >
                  <div>
                    <div className={styles.documentLabels}>
                      <span
                        className={`${styles.categoryMark} ${styles[document.category.toLowerCase()]}`}
                      >
                        {document.category}
                      </span>
                      <LanguageFlags languages={document.languages} />
                    </div>
                    {document.part ? (
                      <span className={styles.documentPart}>{document.part}</span>
                    ) : null}
                    <h3
                      className={
                        language === "vi"
                          ? styles.vietnameseHeading
                          : undefined
                      }
                    >
                      {document.title}
                    </h3>
                    <p>{document.summary}</p>
                    <div className={styles.documentTags} aria-label="Tags">
                      {document.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.rowMeta}>
                    <time dateTime={document.publishedAt}>
                      {formatDocumentDate(
                        document.publishedAt,
                        document.language,
                      )}
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
                  setSelectedTags([]);
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
