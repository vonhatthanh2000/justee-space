import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  DownloadSimple,
  EnvelopeSimple,
  LinkedinLogo,
  MapPin,
} from "@phosphor-icons/react/dist/ssr";
import {
  enterprise_project,
  personal_project,
} from "../../../content/coding/projects";
import type { Project } from "../../../content/coding/types";
import { sapResume } from "../../../content/sap-resume";
import { LiveChatWidget } from "../../components/blog/live-chat-widget";
import styles from "./sap-resume.module.css";
import { VideoCarousel } from "./video-carousel";

const sapKeywords = new Set(["ABAP", "RAP", "SAP SD", "FI/CO", "MM"]);

function EmphasizedSapKeywords({ text }: { text: string }) {
  return text.split(/\b(SAP SD|ABAP|RAP|FI\/CO|MM)\b/g).map((part, index) =>
    sapKeywords.has(part) ? (
      <strong className={styles.sapKeyword} key={`${part}-${index}`}>
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export const metadata: Metadata = {
  title: "SAP Technical Consultant Profile | Thanh Vo",
  description:
    "Thanh Vo's SAP learning, technical presentation, and software-engineering projects.",
  robots: {
    index: false,
    follow: false,
  },
};

const projects = [
  ...enterprise_project.map((project) => ({
    ...project,
    category: "Enterprise" as const,
  })),
  ...personal_project.map((project) => ({
    ...project,
    category: "Personal" as const,
  })),
];

function ProjectCard({
  project,
}: {
  project: Project & { category: "Enterprise" | "Personal" };
}) {
  const content = (
    <>
      <div className={styles.projectImage}>
        <Image
          alt={`${project.name} project preview`}
          fill
          sizes="(max-width: 767px) 76vw, 280px"
          src={project.image}
        />
      </div>
      <div className={styles.projectCopy}>
        <p>{project.category}</p>
        <h3>{project.name}</h3>
        <span>{project.timeline.replace(/[\u2013\u2014]/g, "-")}</span>
      </div>
      {project.href ? (
        <ArrowUpRight
          className={styles.projectArrow}
          aria-hidden="true"
          size={17}
          weight="regular"
        />
      ) : null}
    </>
  );

  return project.href ? (
    <a
      className={styles.projectCard}
      href={project.href}
      rel="noreferrer"
      target="_blank"
    >
      {content}
    </a>
  ) : (
    <article className={styles.projectCard}>{content}</article>
  );
}

function ContactActions() {
  return (
    <nav className={styles.contactActions} aria-label="Contact Thanh Vo">
      <a aria-label="Email Thanh Vo" href={`mailto:${sapResume.email}`}>
        <EnvelopeSimple aria-hidden="true" size={18} weight="regular" />
        <span>Email</span>
      </a>
      <a
        aria-label="View Thanh Vo on LinkedIn"
        href={sapResume.linkedIn}
        rel="noreferrer"
        target="_blank"
      >
        <LinkedinLogo aria-hidden="true" size={18} weight="regular" />
        <span>LinkedIn</span>
      </a>
      <a className={styles.primaryAction} download href={sapResume.cvHref}>
        <DownloadSimple aria-hidden="true" size={18} weight="regular" />
        <span>Download CV</span>
      </a>
    </nav>
  );
}

export default function SapProposalPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.name} href="/" aria-label="Thanh Vo, home">
          {sapResume.name}
        </Link>
        <ContactActions />
      </header>

      <div className={styles.overview}>
        <section className={styles.profile} aria-labelledby="profile-title">
          <div className={styles.profileCopy}>
            <p className={styles.eyebrow}>Candidate profile</p>
            <h1 id="profile-title">{sapResume.headline}</h1>
            <p className={styles.summary}>{sapResume.summary}</p>
          </div>

          <div className={styles.letter}>
            <h2>Dear Hiring Team,</h2>
            {sapResume.coverLetter.map((paragraph) => (
              <p key={paragraph}>
                <EmphasizedSapKeywords text={paragraph} />
              </p>
            ))}
          </div>

          <div className={styles.profileLinks}>
            <p>
              <MapPin aria-hidden="true" size={16} weight="regular" />
              <span>{sapResume.location}</span>
            </p>
            <Link href="/blog/sap-switching">
              <span>Visit my SAP blog</span>
              <ArrowRight aria-hidden="true" size={17} weight="regular" />
            </Link>
          </div>
        </section>

        <section className={styles.video} aria-labelledby="video-title">
          <VideoCarousel
            videos={[
              sapResume.videos.introduction,
              sapResume.videos.sapSd,
              sapResume.videos.sapRap,
            ]}
          />
        </section>

        <section className={styles.projects} aria-labelledby="projects-title">
          <header className={styles.projectsHeading}>
            <div>
              <h2 id="projects-title">Projects</h2>
              <p>Visit my Coding page for full experience details</p>
            </div>
            <Link href="/coding">
              <span>See full experience</span>
              <ArrowRight aria-hidden="true" size={17} weight="regular" />
            </Link>
          </header>
          <div className={styles.projectTrack}>
            {projects.map((project) => (
              <ProjectCard
                key={`${project.category}-${project.id}`}
                project={project}
              />
            ))}
          </div>
        </section>
      </div>
      <LiveChatWidget
        launcherText="Have questions for Thanh?"
        subtitle="Ask about Thanh's experience"
        variant="resume"
        welcomeMessage="Hi, ask me about Thanh's SAP learning and software engineering experience."
      />
    </main>
  );
}
