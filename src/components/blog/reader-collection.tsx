"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/app/blog/blog.module.css";

type ReaderCollectionItem = {
  slug: string;
  title: string;
  categoryClassName: string;
  href: string;
};

type ReaderCollectionGroup = {
  label: string;
  defaultOpen: boolean;
  items: ReaderCollectionItem[];
};

export function ReaderCollection({
  activeSlug,
  groups,
  label,
}: {
  activeSlug: string;
  groups: ReaderCollectionGroup[];
  label: string;
}) {
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    groups.filter((group) => group.defaultOpen).map((group) => group.label),
  );

  function toggleGroup(groupLabel: string) {
    setOpenGroups((current) =>
      current.includes(groupLabel)
        ? current.filter((item) => item !== groupLabel)
        : [...current, groupLabel],
    );
  }

  return (
    <nav aria-label={label}>
      {groups.map((group) => {
        const isOpen = openGroups.includes(group.label);
        return (
          <div className={styles.readerPartGroup} key={group.label}>
            <button
              className={styles.readerPartLabel}
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.label)}
            >
              {group.label}
            </button>
            {isOpen ? (
              <div className={styles.readerPartDocuments}>
                {group.items.map((item) => (
                  <Link
                    className={
                      item.slug === activeSlug
                        ? styles.readerDocumentActive
                        : ""
                    }
                    href={item.href}
                    key={item.slug}
                  >
                    <span className={item.categoryClassName} />
                    {item.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
