import type { Metadata } from "next";
import { Header } from "@/components/header";
import { GraphExplorer } from "@/components/blog/graph-explorer";
import { getDocuments } from "@/lib/documents";
import styles from "../blog.module.css";

export const metadata: Metadata = {
  title: "Graph | Thanh's Blog",
  description: "Explore connections between technical and personal documents.",
};

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ document?: string }>;
}) {
  const { document } = await searchParams;

  return (
    <main className={styles.blogRoot}>
      <Header />
      <GraphExplorer documents={getDocuments()} initialDocument={document} />
    </main>
  );
}
