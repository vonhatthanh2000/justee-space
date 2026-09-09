import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prepareDocumentMarkdown } from "./document-markdown.ts";

test("renders an Obsidian document image embed as an image", () => {
  const markdown = prepareDocumentMarkdown(
    "![[../images/application-server-components.png]]",
  );
  const html = renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkGfm] },
      markdown,
    ),
  );

  assert.match(
    html,
    /<img src="\/blog\/document-images\/application-server-components\.png" alt="application server components"\/?>/,
  );
});

test("does not turn paths outside the document image directory into images", () => {
  assert.equal(
    prepareDocumentMarkdown("![[../../private/secret.png]]"),
    "![[../../private/secret.png]]",
  );
});

test("renders the document's inline LaTeX arrows as symbols", () => {
  assert.equal(
    prepareDocumentMarkdown(
      "Presentation $\\rightarrow$ Dispatcher $\\leftrightarrow$ Database",
    ),
    "Presentation → Dispatcher ↔ Database",
  );
});
