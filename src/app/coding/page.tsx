import type { Metadata } from "next";
import Image from "next/image";
import {
  EnvelopeSimple,
  GithubLogo,
  LinkedinLogo,
} from "@phosphor-icons/react/dist/ssr";
import codingImage from "../../../public/images/coding-1.webp";
import {
  enterprise_project,
  personal_project,
} from "../../../content/coding/projects";
import { experience } from "../../../content/coding/experience";
import { skills } from "../../../content/coding/skills";
import { ExperienceSection } from "@/components/coding/experience-section";
import { ProjectsSection } from "@/components/coding/projects-section";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Coding | Thanh",
  description:
    "Technical work experience in Web3 backend engineering, distributed systems, and database optimization.",
};

export default function CodingPage() {
  return (
    <main className="coding-page">
      <Header />

      <section
        className="coding-intro section-shell"
        aria-labelledby="coding-title"
      >
        <h1 id="coding-title">Coding - Technical work experiences</h1>
        <blockquote>
          Software built with clarity, care, and long-term intent
        </blockquote>
      </section>

      <section
        className="coding-profile section-shell"
        aria-label="About my technical work"
      >
        <figure className="coding-profile-media">
          <Image
            src={codingImage}
            alt="Thanh working at a desk with code displayed across two monitors"
            sizes="(max-width: 767px) calc(100vw - 2.5rem), 45vw"
            priority
          />
        </figure>

        <div className="coding-profile-copy">
          <p>
            I&apos;m a Web3 Backend Engineer with{" "}
            <strong>5 years of experience</strong> developing web applications
            and complex infrastructure. I love diving into new tech, especially
            anything involving Blockchain and AI. I am familiar with Node.js,
            TypeScript, Go, and Docker.
          </p>
          <p>
            Most of my time is spent building in the Web3 space, specifically
            implementing <strong>Layer 1 networks</strong> and{" "}
            <strong>optimizing databases</strong>.
          </p>
          <p>
            One of my favorite recent wins was re-engineering our company&apos;s
            database to increase <strong>query performance by 50%.</strong>
          </p>
        </div>
      </section>

      <section
        className="coding-skills section-shell"
        aria-labelledby="skills-title"
      >
        <h2 id="skills-title">Skills</h2>

        <div className="coding-skills-grid">
          {skills.map((skill) => (
            <article className="coding-skill" key={skill.category}>
              <h3>{skill.category}</h3>
              <p>{skill.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <ProjectsSection
        enterpriseProjects={enterprise_project}
        personalProjects={personal_project}
      />

      <ExperienceSection entries={experience} />

      <section
        className="coding-contact section-shell"
        aria-labelledby="contact-title"
      >
        <h2 id="contact-title">Contact</h2>
        <p className="coding-contact-intro">
          Have a project, technical challenge, or idea worth building? I&apos;m
          always open to a thoughtful conversation.
        </p>

        <div className="coding-contact-icons" aria-label="Contact links">
          <a
            aria-label="GitHub"
            href="https://github.com/vonhatthanh2000"
            rel="noreferrer"
            target="_blank"
          >
            <GithubLogo aria-hidden="true" size={48} weight="regular" />
            <span>GitHub</span>
          </a>
          <a aria-label="Email" href="mailto:nthanhatee@gmail.com">
            <EnvelopeSimple aria-hidden="true" size={48} weight="regular" />
            <span>Email</span>
          </a>
          <a
            aria-label="LinkedIn"
            href="https://www.linkedin.com/in/nhatthanhvo/"
            rel="noreferrer"
            target="_blank"
          >
            <LinkedinLogo aria-hidden="true" size={48} weight="regular" />
            <span>LinkedIn</span>
          </a>
        </div>
      </section>
    </main>
  );
}
