import type { DocumentLanguage } from "@/lib/document-language";
import { documentLanguages } from "@/lib/document-language";
import styles from "@/app/blog/blog.module.css";

export function LanguageFlags({ languages }: { languages: DocumentLanguage[] }) {
  const label = languages.map((language) => documentLanguages[language].label).join(", ");

  return (
    <span className={styles.languageFlags} aria-label={`Available in ${label}`} title={label}>
      {languages.map((language) => (
        <span key={language} lang={language}>
          <span aria-hidden="true">{documentLanguages[language].flag}</span>
          {documentLanguages[language].shortLabel}
        </span>
      ))}
    </span>
  );
}
