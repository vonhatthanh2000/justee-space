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
import { sapProposal } from "../../../content/sap-proposal";
import styles from "./sap-proposal.module.css";

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
      <a aria-label="Email Thanh Vo" href={`mailto:${sapProposal.email}`}>
        <EnvelopeSimple aria-hidden="true" size={18} weight="regular" />
        <span>Email</span>
      </a>
      <a
        aria-label="View Thanh Vo on LinkedIn"
        href={sapProposal.linkedIn}
        rel="noreferrer"
        target="_blank"
      >
        <LinkedinLogo aria-hidden="true" size={18} weight="regular" />
        <span>LinkedIn</span>
      </a>
      <a className={styles.primaryAction} download href={sapProposal.cvHref}>
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
          {sapProposal.name}
        </Link>
        <ContactActions />
      </header>

      <div className={styles.overview}>
        <section className={styles.profile} aria-labelledby="profile-title">
          <div className={styles.profileCopy}>
            <p className={styles.eyebrow}>Candidate profile</p>
            <h1 id="profile-title">{sapProposal.headline}</h1>
            <p className={styles.summary}>{sapProposal.summary}</p>
          </div>

          <div className={styles.letter}>
            <h2>Dear Hiring Team,</h2>
            {sapProposal.coverLetter.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className={styles.profileLinks}>
            <p>
              <MapPin aria-hidden="true" size={16} weight="regular" />
              <span>{sapProposal.location}</span>
            </p>
            <Link href="/blog?lang=en">
              <span>Visit my SAP blog</span>
              <ArrowRight aria-hidden="true" size={17} weight="regular" />
            </Link>
          </div>
        </section>

        <section className={styles.video} aria-labelledby="video-title">
          <div className={styles.videoHeading}>
            <div>
              <p>SAP learning</p>
              <h2 id="video-title">My SAP SD presentation</h2>
            </div>
            <span>SAP RAP / ABAP / SAP SD</span>
          </div>
          <div className={styles.videoFrame}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${sapProposal.video.id}`}
              title={sapProposal.video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </section>

        <section className={styles.projects} aria-labelledby="projects-title">
          <header className={styles.projectsHeading}>
            <div>
              <h2 id="projects-title">Projects</h2>
              <p>Explore from left to right</p>
            </div>
            <Link href="/coding">
              <span>Full experience</span>
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
    </main>
  );
}
