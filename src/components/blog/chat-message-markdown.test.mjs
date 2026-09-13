import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatMessageMarkdown } from "./chat-message-markdown.ts";

const response = `Thanh có **5 năm kinh nghiệm lập trình**, tập trung vào web application và infrastructure phức tạp.

Các skills nổi bật gồm:

- **Backend:** Go, Node.js, NestJS, GraphQL, gRPC
- **Frontend:** Next.js, TypeScript, Tailwind CSS`;

test("renders assistant Markdown with emphasis and lists", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChatMessageMarkdown, null, response),
  );

  assert.match(html, /<strong>5 năm kinh nghiệm lập trình<\/strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li>\s*<strong>Backend:<\/strong>/);
  assert.doesNotMatch(html, /\*\*Backend:\*\*/);
});
