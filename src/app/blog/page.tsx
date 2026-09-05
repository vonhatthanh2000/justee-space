import type { Metadata } from "next";
import { Header } from "@/components/header";
import { BlogCollection } from "@/components/blog/blog-collection";
import { getDocuments } from "@/lib/documents";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Blog | Thanh",
  description: "Technical discoveries, personal observations, and the paths between them.",
};

export default function BlogPage() {
  const documents = getDocuments();

  return (
    <main className={styles.blogRoot}>
      <Header />
      <BlogCollection documents={documents} />
    </main>
  );
}
