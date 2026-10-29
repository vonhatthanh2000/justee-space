import { Header } from "@/components/header";
import { BlogCollection } from "@/components/blog/blog-collection";
import { LiveChatWidget } from "@/components/blog/live-chat-widget";
import { getBlogListDocuments } from "@/lib/documents";
import type { DocumentLanguage } from "@/lib/document-language";
import styles from "@/app/blog/blog.module.css";

export function BlogIndex({ language }: { language: DocumentLanguage }) {
  const documents = getBlogListDocuments(language);

  return (
    <main className={styles.blogRoot}>
      <Header />
      <BlogCollection documents={documents} language={language} />
      <LiveChatWidget />
    </main>
  );
}
