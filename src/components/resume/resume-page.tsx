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

import { LiveChatWidget } from "../blog/live-chat-widget";
import styles from "../../app/sap-resume/sap-resume.module.css";
import { VideoCarousel } from "../../app/sap-resume/video-carousel";

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

export type ResumeProfile = {
  name: string;
  headline: string;
  summary: string;
  location: string;
  coverLetter: readonly string[];
  email: string;
  linkedIn: string;
  cvHref: string;
  profileLink: { href: string; label: string };
  videoLabel: string;
  videos: readonly { id: string; title: string }[];
  welcomeMessage: string;
  emphasizeSap?: boolean;
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

function ContactActions({ resume }: { resume: ResumeProfile }) {
  return (
    <nav className={styles.contactActions} aria-label="Contact Thanh Vo">
      <a aria-label="Email Thanh Vo" href={`mailto:${resume.email}`}>
        <EnvelopeSimple aria-hidden="true" size={18} weight="regular" />
        <span>Email</span>
      </a>
      <a
        aria-label="View Thanh Vo on LinkedIn"
        href={resume.linkedIn}
        rel="noreferrer"
        target="_blank"
      >
        <LinkedinLogo aria-hidden="true" size={18} weight="regular" />
        <span>LinkedIn</span>
      </a>
      <a className={styles.primaryAction} download href={resume.cvHref}>
        <DownloadSimple aria-hidden="true" size={18} weight="regular" />
        <span>Download CV</span>
      </a>
    </nav>
  );
}

export function ResumePage({ resume }: { resume: ResumeProfile }) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.name} href="/" aria-label="Thanh Vo, home">
          {resume.name}
        </Link>
        <ContactActions resume={resume} />
      </header>

      <div className={styles.overview}>
        <section className={styles.profile} aria-labelledby="profile-title">
          <div className={styles.profileCopy}>
            <p className={styles.eyebrow}>Candidate profile</p>
            <h1 id="profile-title">{resume.headline}</h1>
            <p className={styles.summary}>{resume.summary}</p>
          </div>

          <div className={styles.letter}>
            <h2>Dear Hiring Team,</h2>
            {resume.coverLetter.map((paragraph) => (
              <p key={paragraph}>
                {resume.emphasizeSap ? (
                  <EmphasizedSapKeywords text={paragraph} />
                ) : (
                  paragraph
                )}
              </p>
            ))}
          </div>

          <div className={styles.profileLinks}>
            <p>
              <MapPin aria-hidden="true" size={16} weight="regular" />
              <span>{resume.location}</span>
            </p>
            <Link href={resume.profileLink.href}>
              <span>{resume.profileLink.label}</span>
              <ArrowRight aria-hidden="true" size={17} weight="regular" />
            </Link>
          </div>
        </section>

        <section className={styles.video} aria-labelledby="video-title">
          <VideoCarousel label={resume.videoLabel} videos={resume.videos} />
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
        welcomeMessage={resume.welcomeMessage}
      />
    </main>
  );
}
