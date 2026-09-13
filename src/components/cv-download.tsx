export function CvDownload() {
  return (
    <section className="cv-download section-shell" aria-labelledby="cv-title">
      <div className="cv-download-inner reveal">
        <div>
          <p>Resume</p>
          <h2 id="cv-title">A closer look at my work.</h2>
        </div>

        <a
          download="Thanh_CV.pdf"
          href="/content/coding/Thanh_CV.pdf"
          type="application/pdf"
        >
          Get Thanh CV
          <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
