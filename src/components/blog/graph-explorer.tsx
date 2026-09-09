"use client";

import { useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRight,
  CornersOut,
  MagnifyingGlass,
  Minus,
  Plus,
  X,
} from "@phosphor-icons/react";
import type { BlogDocument, DocumentCategory } from "@/lib/documents";
import type { DocumentLanguage } from "@/lib/document-language";
import { getGraphPositions } from "@/lib/graph-layout";
import {
  documentLanguages,
  getDocumentHref,
  getGraphHref,
} from "@/lib/document-language";
import { prepareDocumentMarkdown } from "@/lib/document-markdown";
import { BlogToolbar } from "./blog-toolbar";
import { LanguageFlags } from "./language-flags";
import styles from "@/app/blog/blog.module.css";

const categoryOptions: DocumentCategory[] = ["Personal", "Technical"];
const minimumZoom = 0.65;
const maximumZoom = 1.6;

export function GraphExplorer({
  documents,
  initialDocument,
  language,
}: {
  documents: BlogDocument[];
  initialDocument?: string;
  language: DocumentLanguage;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categories, setCategories] =
    useState<DocumentCategory[]>(categoryOptions);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(initialDocument ?? "");
  const viewportRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const tags = useMemo(
    () =>
      Array.from(
        new Set(documents.flatMap((document) => document.tags)),
      ).sort(),
    [documents],
  );

  const visibleDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents.filter(
      (document) =>
        categories.includes(document.category) &&
        (selectedTags.length === 0 ||
          selectedTags.some((tag) => document.tags.includes(tag))) &&
        (normalized.length === 0 ||
          `${document.part ?? ""} ${document.title} ${document.summary} ${document.tags.join(" ")}`
            .toLowerCase()
            .includes(normalized)),
    );
  }, [categories, documents, query, selectedTags]);

  const visibleSlugs = useMemo(
    () => new Set(visibleDocuments.map((document) => document.slug)),
    [visibleDocuments],
  );

  const nodePositions = useMemo(
    () => getGraphPositions(documents.map((document) => document.slug)),
    [documents],
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
    router.replace(getGraphHref(language, slug), { scroll: false });
  }

  function closePreview() {
    setSelectedSlug("");
    router.replace(getGraphHref(language), { scroll: false });
  }

  function toggleCategory(category: DocumentCategory) {
    setCategories((current) => {
      if (current.includes(category)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== category);
      }
      return [...current, category];
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  function applyTransform(next: { x: number; y: number; scale: number }) {
    transformRef.current = next;
    if (viewportRef.current) {
      viewportRef.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
    }
  }

  function changeZoom(amount: number) {
    const current = transformRef.current;
    const scale = Math.min(
      maximumZoom,
      Math.max(minimumZoom, current.scale + amount),
    );
    applyTransform({ ...current, scale });
  }

  function resetViewport() {
    applyTransform({ x: 0, y: 0, scale: 1 });
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const current = transformRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const cursorX = event.clientX - rect.left - rect.width / 2;
    const cursorY = event.clientY - rect.top - rect.height / 2;
    const scale = Math.min(
      maximumZoom,
      Math.max(minimumZoom, current.scale * Math.exp(-event.deltaY * 0.0012)),
    );
    const ratio = scale / current.scale;

    applyTransform({
      x: cursorX - (cursorX - current.x) * ratio,
      y: cursorY - (cursorY - current.y) * ratio,
      scale,
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    if (event.target instanceof Element && event.target.closest("button, a"))
      return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transformRef.current.x,
      originY: transformRef.current.y,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    applyTransform({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
      scale: transformRef.current.scale,
    });
  }

  function finishDragging(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <>
      <BlogToolbar
        activeMode="graph"
        query={query}
        onQueryChange={setQuery}
        language={language}
      />
      <section
        className={styles.graphPage}
        aria-labelledby="graph-title"
        lang={language}
      >
        <header className={styles.graphHeader}>
          <div>
            <p>Explore the collection</p>
            <h1 id="graph-title">Graph view</h1>
          </div>
          <div className={styles.graphHeaderControls}>
            <div className={styles.graphStats}>
              <span>
                <strong>{visibleDocuments.length}</strong> documents
              </span>
              <span>
                <strong>{edges.length}</strong> connections
              </span>
            </div>
            <nav
              className={`${styles.modeSwitch} ${styles.languageModeSwitch}`}
              aria-label="Choose the graph language"
            >
              {(["vi", "en"] as DocumentLanguage[]).map((option) => (
                <Link
                  className={language === option ? styles.modeActive : ""}
                  href={getGraphHref(option, selectedSlug || undefined)}
                  hrefLang={option}
                  key={option}
                  aria-current={language === option ? "page" : undefined}
                >
                  <span aria-hidden="true">{documentLanguages[option].flag}</span>
                  {documentLanguages[option].shortLabel}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className={styles.graphFilters} aria-label="Graph filters">
          <div role="group" aria-label="Filter graph by category">
            {categoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                className={
                  categories.includes(category) ? styles.filterActive : ""
                }
                onClick={() => toggleCategory(category)}
              >
                <span className={styles[category.toLowerCase()]} />
                {category}
              </button>
            ))}
          </div>
          <div
            className={styles.graphTagFilters}
            role="group"
            aria-label="Filter graph by tag"
          >
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={
                  selectedTags.includes(tag) ? styles.filterActive : ""
                }
                onClick={() => toggleTag(tag)}
                aria-pressed={selectedTags.includes(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div
          className={styles.graphStage}
          role="region"
          aria-label="Interactive document graph. Drag to move and scroll to zoom."
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDragging}
          onPointerCancel={finishDragging}
        >
          {visibleDocuments.length ? (
            <div className={styles.graphViewport} ref={viewportRef}>
              <svg
                viewBox="0 0 900 620"
                role="img"
                aria-label="Connections between blog documents"
              >
                {edges.map((edge) => {
                  const emphasized =
                    selectedSlug === edge.from || selectedSlug === edge.to;
                  const startsAtSelection = selectedSlug === edge.to;
                  const fromSlug = startsAtSelection ? edge.to : edge.from;
                  const toSlug = startsAtSelection ? edge.from : edge.to;
                  const from = nodePositions.get(fromSlug);
                  const to = nodePositions.get(toSlug);
                  if (!from || !to) return null;
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
              {visibleDocuments.map((document, index) => {
                const [x, y] = nodePositions.get(document.slug) ?? [450, 310];
                const isSelected = document.slug === selectedSlug;
                const isNeighbor =
                  selected?.connections.includes(document.slug) ||
                  document.connections.includes(selectedSlug);
                return (
                  <button
                    className={`${styles.graphNode} ${styles[document.category.toLowerCase()]} ${isSelected ? styles.nodeSelected : ""} ${selected && !isSelected && !isNeighbor ? styles.nodeDimmed : ""}`}
                    style={
                      {
                        left: `${(x / 900) * 100}%`,
                        top: `${(y / 620) * 100}%`,
                        "--node-delay": `${250 + index * 70}ms`,
                      } as CSSProperties
                    }
                    type="button"
                    data-graph-node
                    key={document.slug}
                    onClick={() => selectDocument(document.slug)}
                    aria-pressed={isSelected}
                  >
                    <span aria-hidden="true" />
                    <strong className={language === "vi" ? styles.vietnameseHeading : undefined}>
                      {document.title}
                    </strong>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.graphEmpty}>
              <MagnifyingGlass size={28} aria-hidden="true" />
              <h2>No matching documents</h2>
              <p>Try a broader search or enable both categories.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategories(categoryOptions);
                  setSelectedTags([]);
                }}
              >
                Reset filters
              </button>
            </div>
          )}

          <div className={styles.graphLegend}>
            <span>
              <i className={styles.personal} /> Personal
            </span>
            <span>
              <i className={styles.technical} /> Technical
            </span>
          </div>

          <p className={styles.graphHint}>Drag to move. Scroll to zoom.</p>

          <div className={styles.zoomControls} aria-label="Graph zoom controls">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => changeZoom(-0.12)}
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              aria-label="Fit graph"
              onClick={resetViewport}
            >
              <CornersOut size={16} />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => changeZoom(0.12)}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {selected ? (
          <aside
            className={styles.nodePreview}
            aria-label={`Preview of ${selected.title}`}
          >
            <button
              className={styles.previewClose}
              type="button"
              onClick={closePreview}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
            <span
              className={`${styles.categoryName} ${styles[selected.category.toLowerCase()]}`}
            >
              {selected.category}
            </span>
            <LanguageFlags languages={selected.languages} />
            {selected.part ? (
              <span className={styles.documentPart}>{selected.part}</span>
            ) : null}
            <h2 className={language === "vi" ? styles.vietnameseHeading : undefined}>
              {selected.title}
            </h2>
            <p className={styles.previewSummary}>{selected.summary}</p>
            <div className={styles.documentTags} aria-label="Tags">
              {selected.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
            <div className={styles.previewMarkdown}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: () => null,
                  a: ({ href = "", children }) => (
                    <a
                      href={href}
                      rel={href.startsWith("/blog/") ? undefined : "noreferrer"}
                      target={href.startsWith("/blog/") ? undefined : "_blank"}
                      onClick={(event) => {
                        if (!href.startsWith("/blog/")) return;
                        const slug = href.slice("/blog/".length).split("#")[0];
                        if (
                          !documents.some((document) => document.slug === slug)
                        )
                          return;
                        event.preventDefault();
                        selectDocument(slug);
                      }}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {prepareDocumentMarkdown(selected.previewContent)}
              </ReactMarkdown>
              <p
                className={styles.previewEllipsis}
                aria-label="Preview continues on the full page"
              >
                ...
              </p>
            </div>
            <div className={styles.previewConnections}>
              <span>
                {selected.connections.length + selected.backlinks.length} nearby
                documents
              </span>
              <div>
                {Array.from(
                  new Set([...selected.connections, ...selected.backlinks]),
                )
                  .slice(0, 3)
                  .map((slug) => {
                    const related = documents.find(
                      (document) => document.slug === slug,
                    );
                    return related ? (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => selectDocument(slug)}
                      >
                        {related.title}
                      </button>
                    ) : null;
                  })}
              </div>
            </div>
            <Link
              className={styles.fullPageLink}
              href={getDocumentHref(selected.slug, selected.language)}
            >
              View full page <ArrowRight size={17} />
            </Link>
          </aside>
        ) : null}
      </section>
    </>
  );
}
