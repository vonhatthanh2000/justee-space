"use client";

import Link from "next/link";
import { BookOpenText, Graph, MagnifyingGlass } from "@phosphor-icons/react";
import styles from "@/app/blog/blog.module.css";

type BlogToolbarProps = {
  activeMode: "documents" | "graph";
  query?: string;
  onQueryChange?: (value: string) => void;
};

export function BlogToolbar({ activeMode, query = "", onQueryChange }: BlogToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <Link className={styles.blogIdentity} href="/blog">
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
        <Link className={activeMode === "documents" ? styles.modeActive : ""} href="/blog">
          <BookOpenText size={17} aria-hidden="true" />
          <span>Documents</span>
        </Link>
        <Link className={activeMode === "graph" ? styles.modeActive : ""} href="/blog/graph">
          <Graph size={17} aria-hidden="true" />
          <span>Graph</span>
        </Link>
      </nav>
    </div>
  );
}
