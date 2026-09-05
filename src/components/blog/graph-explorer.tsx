"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CornersOut,
  MagnifyingGlass,
  Minus,
  Plus,
  X,
} from "@phosphor-icons/react";
import type { BlogDocument, DocumentCategory } from "@/lib/documents";
import { BlogToolbar } from "./blog-toolbar";
import styles from "@/app/blog/blog.module.css";

const positions: Record<string, [number, number]> = {
  "welcome-to-the-blog": [455, 294],
  "why-this-blog-has-a-graph": [680, 205],
  "building-useful-ai-systems": [775, 390],
  "finding-database-bottlenecks": [620, 510],
  "learning-in-public": [285, 445],
  "photography-as-observation": [155, 280],
};

const categoryOptions: DocumentCategory[] = ["Personal", "Technical"];

export function GraphExplorer({
  documents,
  initialDocument,
}: {
  documents: BlogDocument[];
  initialDocument?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<DocumentCategory[]>(categoryOptions);
  const [selectedSlug, setSelectedSlug] = useState(initialDocument ?? "");
  const [zoom, setZoom] = useState(1);

  const visibleDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents.filter(
      (document) =>
        categories.includes(document.category) &&
        (normalized.length === 0 ||
          `${document.title} ${document.summary}`.toLowerCase().includes(normalized)),
    );
  }, [categories, documents, query]);

  const visibleSlugs = useMemo(
    () => new Set(visibleDocuments.map((document) => document.slug)),
    [visibleDocuments],
  );

  const edges = useMemo(() => {
    const seen = new Set<string>();
    return visibleDocuments.flatMap((document) =>
      document.connections.flatMap((target) => {
        if (!visibleSlugs.has(target)) return [];
        const key = [document.slug, target].sort().join(":");
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ from: document.slug, to: target }];
      }),
    );
  }, [visibleDocuments, visibleSlugs]);

  const selected = documents.find((document) => document.slug === selectedSlug);

  function selectDocument(slug: string) {
    setSelectedSlug(slug);
    router.replace(`/blog/graph?document=${slug}`, { scroll: false });
  }

  function closePreview() {
    setSelectedSlug("");
    router.replace("/blog/graph", { scroll: false });
  }

  function toggleCategory(category: DocumentCategory) {
    setCategories((current) => {
      if (current.includes(category)) {
        return current.length === 1 ? current : current.filter((item) => item !== category);
      }
      return [...current, category];
    });
  }

  return (
    <>
      <BlogToolbar activeMode="graph" query={query} onQueryChange={setQuery} />
      <section className={styles.graphPage} aria-labelledby="graph-title">
        <header className={styles.graphHeader}>
          <div>
            <p>Explore the collection</p>
            <h1 id="graph-title">Graph view</h1>
          </div>
          <div className={styles.graphStats}>
            <span><strong>{visibleDocuments.length}</strong> documents</span>
            <span><strong>{edges.length}</strong> connections</span>
          </div>
        </header>

        <div className={styles.graphFilters} aria-label="Filter graph by category">
          {categoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              className={categories.includes(category) ? styles.filterActive : ""}
              onClick={() => toggleCategory(category)}
            >
              <span className={styles[category.toLowerCase()]} />
              {category}
            </button>
          ))}
        </div>

        <div className={styles.graphStage}>
          {visibleDocuments.length ? (
            <div className={styles.graphViewport} style={{ transform: `scale(${zoom})` }}>
              <svg viewBox="0 0 900 620" role="img" aria-label="Connections between blog documents">
                {edges.map((edge) => {
                  const from = positions[edge.from] ?? [450, 310];
                  const to = positions[edge.to] ?? [450, 310];
                  const emphasized = selectedSlug === edge.from || selectedSlug === edge.to;
                  return (
                    <line
                      className={emphasized ? styles.edgeActive : styles.edge}
                      key={`${edge.from}-${edge.to}`}
                      x1={from[0]}
                      y1={from[1]}
                      x2={to[0]}
                      y2={to[1]}
                    />
                  );
                })}
              </svg>
              {visibleDocuments.map((document) => {
                const [x, y] = positions[document.slug] ?? [450, 310];
                const isSelected = document.slug === selectedSlug;
                const isNeighbor = selected?.connections.includes(document.slug) || document.connections.includes(selectedSlug);
                return (
                  <button
                    className={`${styles.graphNode} ${styles[document.category.toLowerCase()]} ${isSelected ? styles.nodeSelected : ""} ${selected && !isSelected && !isNeighbor ? styles.nodeDimmed : ""}`}
                    style={{ left: `${(x / 900) * 100}%`, top: `${(y / 620) * 100}%` }}
                    type="button"
                    key={document.slug}
                    onClick={() => selectDocument(document.slug)}
                    aria-pressed={isSelected}
                  >
                    <span aria-hidden="true" />
                    <strong>{document.title}</strong>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.graphEmpty}>
              <MagnifyingGlass size={28} aria-hidden="true" />
              <h2>No matching documents</h2>
              <p>Try a broader search or enable both categories.</p>
            </div>
          )}

          <div className={styles.graphLegend}>
            <span><i className={styles.personal} /> Personal</span>
            <span><i className={styles.technical} /> Technical</span>
          </div>

          <div className={styles.zoomControls} aria-label="Graph zoom controls">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.75, value - 0.1))}>
              <Minus size={16} />
            </button>
            <button type="button" aria-label="Fit graph" onClick={() => setZoom(1)}>
              <CornersOut size={16} />
            </button>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.25, value + 0.1))}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {selected ? (
          <aside className={styles.nodePreview} aria-label={`Preview of ${selected.title}`}>
            <button className={styles.previewClose} type="button" onClick={closePreview} aria-label="Close preview">
              <X size={18} />
            </button>
            <span className={`${styles.categoryName} ${styles[selected.category.toLowerCase()]}`}>
              {selected.category}
            </span>
            <h2>{selected.title}</h2>
            <p className={styles.previewSummary}>{selected.summary}</p>
            <div className={styles.previewExcerpt}>{selected.excerpt}</div>
            <div className={styles.previewConnections}>
              <span>{selected.connections.length + selected.backlinks.length} nearby documents</span>
              <div>
                {Array.from(new Set([...selected.connections, ...selected.backlinks])).slice(0, 3).map((slug) => {
                  const related = documents.find((document) => document.slug === slug);
                  return related ? (
                    <button key={slug} type="button" onClick={() => selectDocument(slug)}>
                      {related.title}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
            <Link className={styles.fullPageLink} href={`/blog/${selected.slug}`}>
              View full page <ArrowRight size={17} />
            </Link>
          </aside>
        ) : null}
      </section>
    </>
  );
}
