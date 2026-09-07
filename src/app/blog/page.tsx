import type { Metadata } from "next";
import { Header } from "@/components/header";
import { BlogCollection } from "@/components/blog/blog-collection";
import { getDocuments } from "@/lib/documents";
import { isDocumentLanguage } from "@/lib/document-language";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Blog | Thanh",
  description: "Technical discoveries, personal observations, and the paths between them.",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const { lang } = await searchParams;
  const requestedLanguage = Array.isArray(lang) ? lang[0] : lang;
  const language = isDocumentLanguage(requestedLanguage) ? requestedLanguage : "vi";
  const documents = getDocuments(language);

  return (
    <main className={styles.blogRoot}>
      <Header />
      <BlogCollection documents={documents} language={language} />
    </main>
  );
}
