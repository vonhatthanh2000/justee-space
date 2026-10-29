import assert from "node:assert/strict";
import test from "node:test";
import {
  createBlogListDocuments,
  createDocumentSearchIndex,
  createGraphDocuments,
  getDocumentPreviewHref,
  getDocumentSearchIndexHref,
} from "./document-catalog.ts";

const document = {
  slug: "quiet-stop",
  language: "vi",
  languages: ["vi"],
  title: "Một khoảng dừng",
  part: "Part 3",
  summary: "A short summary.",
  category: "Personal",
  tags: ["journal"],
  publishedAt: "2026-10-24",
  draft: false,
  content: "A body-only phrase about Vĩnh Hy.",
  excerpt: "A body-only phrase",
  previewContent: "A body-only phrase about Vĩnh Hy.",
  connections: ["hello-world"],
  backlinks: [],
  unresolvedReferences: [],
  readingMinutes: 4,
};

test("creates lightweight list documents without Markdown content", () => {
  const [listDocument] = createBlogListDocuments([document]);

  assert.deepEqual(listDocument, {
    slug: "quiet-stop",
    language: "vi",
    languages: ["vi"],
    title: "Một khoảng dừng",
    part: "Part 3",
    summary: "A short summary.",
    category: "Personal",
    tags: ["journal"],
    publishedAt: "2026-10-24",
    readingMinutes: 4,
    connectionCount: 1,
  });
  assert.equal("content" in listDocument, false);
  assert.equal("excerpt" in listDocument, false);
  assert.equal("previewContent" in listDocument, false);
});

test("keeps body text searchable in the lazy search index", () => {
  const index = createDocumentSearchIndex([document]);

  assert.match(index[document.slug], /body-only phrase about vĩnh hy/);
  assert.equal(getDocumentSearchIndexHref("en"), "/blog/search-index/en");
});

test("creates lightweight graph documents and lazy preview URLs", () => {
  const [graphDocument] = createGraphDocuments([document]);

  assert.equal(graphDocument.slug, document.slug);
  assert.deepEqual(graphDocument.connections, ["hello-world"]);
  assert.equal("content" in graphDocument, false);
  assert.equal("excerpt" in graphDocument, false);
  assert.equal("previewContent" in graphDocument, false);
  assert.equal(
    getDocumentPreviewHref("quiet-stop", "vi"),
    "/blog/document-preview/vi/quiet-stop",
  );
});
