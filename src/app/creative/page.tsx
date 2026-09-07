import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { InstagramLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { Header } from "@/components/header";
import { photos, type Photo } from "../../../content/creative/photos";
import styles from "./creative.module.css";

export const metadata: Metadata = {
  title: "Creative | Thanh",
  description: "Photography, film, music, and visual experiments by Thanh.",
};

function aspectRatioStyle(aspectRatio: Photo["aspectRatio"]): CSSProperties {
  return { aspectRatio: aspectRatio.replace(":", " / ") };
}

function PhotoFrame({ photo, index }: { photo: Photo; index: number }) {
  const frame = (
    <figure
      className={styles.frame}
      style={aspectRatioStyle(photo.aspectRatio)}
    >
      <Image
        className={styles.image}
        src={photo.image}
        alt={photo.title}
        fill
        sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 62px) / 2), calc((100vw - 132px) / 3)"
        preload={index === 0}
      />

      <figcaption className={styles.overlay}>
        <span className={styles.category}>{photo.category}</span>
        <strong>{photo.title}</strong>
        {photo.role ? <span className={styles.role}>{photo.role}</span> : null}
        {photo.url ? (
          <span className={styles.viewWork}>View work →</span>
        ) : null}
      </figcaption>
    </figure>
  );

  let content: ReactNode = frame;

  if (photo.url) {
    content = (
      <a
        className={styles.photoLink}
        href={photo.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`View ${photo.title}`}
      >
        {frame}
      </a>
    );
  }

  return <article className={styles.item}>{content}</article>;
}

export default function CreativePage() {
  return (
    <main className={styles.page}>
      <Header />

      <header className={styles.intro}>
        <h1>Creative</h1>
        <p>Photography, film, music, and visual experiments.</p>
      </header>

      <section className={styles.gallerySection} aria-label="Creative gallery">
        {photos.length > 0 ? (
          <div className={styles.gallery}>
            {photos.map((photo, index) => (
              <PhotoFrame photo={photo} index={index} key={photo.image.src} />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>The gallery is being prepared.</p>
        )}
      </section>

      <footer className={styles.socialFooter}>
        <a
          href="https://www.instagram.com/nhatthanh.vo/"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram, nhatthanh.vo"
        >
          <InstagramLogoIcon aria-hidden="true" size={32} weight="regular" />
          <span>Instagram</span>
        </a>
      </footer>
    </main>
  );
}
