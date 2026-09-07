"use client";

import { useEffect, useState } from "react";
import styles from "@/app/blog/blog.module.css";

type TableOfContentsItem = {
  id: string;
  label: string;
};

export function TableOfContents({
  items,
  label = "On this page",
}: {
  items: TableOfContentsItem[];
  label?: string;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];

        if (current) setActiveId(current.target.id);
      },
      { rootMargin: "-150px 0px -68% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className={styles.tableOfContents} aria-label={label}>
      <p className={styles.railLabel}>{label}</p>
      {items.map((item) => (
        <a
          className={activeId === item.id ? styles.tocActive : ""}
          href={`#${item.id}`}
          key={item.id}
          aria-current={activeId === item.id ? "location" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
