"use client";

import Link from "next/link";
import { BookOpenText, Graph, MagnifyingGlass } from "@phosphor-icons/react";
import type { DocumentLanguage } from "@/lib/document-language";
import { getBlogHref, getGraphHref } from "@/lib/document-language";
import styles from "@/app/blog/blog.module.css";

type BlogToolbarProps = {
  activeMode: "documents" | "graph";
  query?: string;
  onQueryChange?: (value: string) => void;
  language?: DocumentLanguage;
};

export function BlogToolbar({
  activeMode,
  query = "",
  onQueryChange,
  language = "vi",
}: BlogToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <Link className={styles.blogIdentity} href={getBlogHref(language)}>
        <span className={styles.identityOrbit} aria-hidden="true" />
        <span>Thanh&apos;s blog</span>
      </Link>

      {onQueryChange ? (
        <label className={styles.searchField}>
          <MagnifyingGlass size={17} weight="regular" aria-hidden="true" />
          <span className="sr-only">Search documents</span>
          <input
            data-blog-search
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search documents"
          />
          <kbd>/</kbd>
        </label>
      ) : (
        <div className={styles.toolbarSpacer} />
      )}

      <nav className={styles.modeSwitch} aria-label="Blog view">
        <Link
          className={activeMode === "documents" ? styles.modeActive : ""}
          href={getBlogHref(language)}
        >
          <BookOpenText size={17} aria-hidden="true" />
          <span>Documents</span>
        </Link>
        <Link
          className={activeMode === "graph" ? styles.modeActive : ""}
          href={getGraphHref(language)}
        >
          <Graph size={17} aria-hidden="true" />
          <span>Graph</span>
        </Link>
      </nav>
    </div>
  );
}
