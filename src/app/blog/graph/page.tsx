import type { Metadata } from "next";
import { Header } from "@/components/header";
import { GraphExplorer } from "@/components/blog/graph-explorer";
import { getDocuments } from "@/lib/documents";
import { isDocumentLanguage } from "@/lib/document-language";
import styles from "../blog.module.css";

export const metadata: Metadata = {
  title: "Graph | Thanh's Blog",
  description: "Explore connections between technical and personal documents.",
};

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{
    document?: string | string[];
    lang?: string | string[];
  }>;
}) {
  const { document, lang } = await searchParams;
  const requestedDocument = Array.isArray(document) ? document[0] : document;
  const requestedLanguage = Array.isArray(lang) ? lang[0] : lang;
  const language = isDocumentLanguage(requestedLanguage) ? requestedLanguage : "vi";

  return (
    <main className={styles.blogRoot}>
      <Header />
      <GraphExplorer
        documents={getDocuments(language)}
        initialDocument={requestedDocument}
        language={language}
      />
    </main>
  );
}
