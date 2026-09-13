import Image from "next/image";
import Link from "next/link";
import { CvDownload } from "@/components/cv-download";
import { Header } from "@/components/header";
import { OrbitMark } from "@/components/orbit-mark";

const destinations = [
  {
    href: "/blog",
    title: "Blog",
    description:
      "Notes, technical discoveries, and lessons from building software.",
  },
  {
    href: "/coding",
    title: "Coding",
    description:
      "Selected products, experiments, and engineering case studies.",
  },
  {
    href: "/creative",
    title: "Creative",
    description: "Photography, filmmaking, music, and visual experiments.",
  },
];

export default function Home() {
  return (
    <main>
      <Header />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-mesh" aria-hidden="true" />
        <div className="hero-stars" aria-hidden="true" />
        <div className="hero-wash" />
        <div className="hero-content">
          <p className="hero-intro">👋 Hi, I&apos;m Thanh</p>
          <h1 id="hero-title">
            <span>I build software, document what I learn,</span>
            <span>and collect ideas that might become</span>
            <span>
              <em>something interesting.</em>
            </span>
          </h1>
        </div>
      </section>

      <section
        className="about section-shell"
        id="about"
        aria-labelledby="about-title"
      >
        <div className="section-label">About</div>
        <div className="about-grid">
          <div className="portrait-wrap reveal">
            <OrbitMark />
          </div>

          <div className="about-copy reveal">
            <h2 id="about-title">
              Building useful systems with a curious mind.
            </h2>
            <p className="about-lead">
              I am a <strong>developer with 5 years of experience</strong>,
              specializing in cutting-edge technologies like{" "}
              <strong>AI and Blockchain.</strong> My focus lies in solving core
              software engineering challenges, such as{" "}
              <strong>Database Optimization</strong> and resolving{" "}
              <strong>system bottlenecks</strong>, while leveraging technology
              to solve real-world problems.
            </p>
          </div>
        </div>

        <div className="about-followup">
          <p className="about-statement statement-reveal">
            For me, every project is an opportunity to innovate, whether that
            means optimizing architecture, refining interaction patterns, or
            deepening user empathy.
          </p>
          <div className="about-statement-line reveal" aria-hidden="true" />
          <p className="about-statement statement-reveal">
            Beyond tech, I am driven by <strong>art and creativity</strong>,
            whether it&apos;s
            <strong> photography, filming, or playing music</strong>. I love
            exploring anything I find interesting.
          </p>
        </div>
      </section>

      <section
        className="trajectory section-shell"
        aria-labelledby="trajectory-title"
      >
        <div className="trajectory-heading reveal">
          <h2 id="trajectory-title">Current Focus</h2>
        </div>

        <div className="trajectory-layout">
          <figure className="trajectory-visual reveal">
            <div className="trajectory-media">
              <Image
                src="/images/interest & career.webp"
                alt="Thanh's camera and development workspace"
                fill
                sizes="(max-width: 768px) 100vw, 55vw"
              />
            </div>
          </figure>

          <div className="trajectory-list">
            <article className="trajectory-item reveal">
              <h3>Building</h3>
              <p>
                Software systems that apply AI and blockchain to useful,
                real-world problems.
              </p>
            </article>
            <article className="trajectory-item reveal">
              <h3>Improving</h3>
              <p>
                Architecture, database performance, reliability, and the
                bottlenecks that appear as products grow.
              </p>
            </article>
            <article className="trajectory-item reveal">
              <h3>Exploring</h3>
              <p>
                Photography, filmmaking, music, and ideas that may become new
                projects.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        className="explore section-shell"
        aria-labelledby="explore-title"
      >
        <div className="explore-intro reveal">
          <h2 id="explore-title">Continue exploring</h2>
          <p>
            The rest of this site collects what I build, learn, create, and
            enjoy outside software.
          </p>
        </div>
        <div className="destination-list">
          {destinations.map((destination) => (
            <Link
              className="destination reveal"
              href={destination.href}
              key={destination.href}
            >
              <h3>{destination.title}</h3>
              <p>{destination.description}</p>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <CvDownload />

      <footer className="footer section-shell">
        <div>
          <strong>Thanh</strong>
          <p>Software, ideas, and creative work.</p>
        </div>
        <div className="footer-links">
          <a href="mailto:nthanhatee@gmail.com">Email</a>
          <a
            href="https://github.com/vonhatthanh2000"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/nhatthanhvo/"
            rel="noreferrer"
            target="_blank"
          >
            LinkedIn
          </a>
        </div>
        <p className="copyright">© {new Date().getFullYear()} Thanh</p>
      </footer>
    </main>
  );
}
