import Link from "next/link";
import { Header } from "@/components/header";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <main className="placeholder-page">
      <Header />
      <div className="placeholder-inner">
        <p>Collection in progress</p>
        <h1>{title}</h1>
        <span>{description}</span>
        <Link href="/">Return home</Link>
      </div>
    </main>
  );
}
