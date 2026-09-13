import { createElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatMessageMarkdown({ children }: { children: string }) {
  return createElement(
    ReactMarkdown,
    { remarkPlugins: [remarkGfm] },
    children,
  );
}
