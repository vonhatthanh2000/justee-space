"use client";

import { useRef, useState, type WheelEvent } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import styles from "./sap-resume.module.css";

type Video = {
  id: string;
  title: string;
};

export function VideoCarousel({ videos }: { videos: readonly Video[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const lastWheelChange = useRef(0);
  const activeVideo = videos[activeIndex];

  function changeVideo(direction: 1 | -1) {
    setActiveIndex(
      (currentIndex) =>
        (currentIndex + direction + videos.length) % videos.length,
    );
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const movement = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;
    const now = Date.now();

    if (Math.abs(movement) < 12 || now - lastWheelChange.current < 650) {
      return;
    }

    lastWheelChange.current = now;
    changeVideo(movement > 0 ? 1 : -1);
  }

  return (
    <>
      <div className={styles.videoHeading}>
        <div>
          <p>SAP learning</p>
          <h2 id="video-title">{activeVideo.title}</h2>
        </div>
        <span>{videos.length} presentations</span>
      </div>

      <div className={styles.videoCarousel}>
        <div className={styles.videoNavigator} onWheel={handleWheel}>
          <p className={styles.videoGuide}>Choose a video</p>
          <div className={styles.videoChoices}>
            {videos.map((video, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`Play ${video.title}`}
                  className={`${styles.videoChoice} ${isActive ? styles.activeVideoChoice : ""}`}
                  key={video.id}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                >
                  <span>{video.title}</span>
                  {isActive ? (
                    <small>Playing</small>
                  ) : (
                    <ArrowRight
                      aria-hidden="true"
                      size={18}
                      weight="regular"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className={styles.videoProgress} aria-live="polite">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(videos.length).padStart(2, "0")}
          </p>
        </div>

        <div className={styles.videoFrame}>
          <iframe
            key={activeVideo.id}
            src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}`}
            title={activeVideo.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </>
  );
}
