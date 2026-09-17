import type { ResumeProfile } from "../src/components/resume/resume-page";

export const seResume = {
  name: "Thanh Vo",
  headline: "Software Engineer",
  summary:
    "Five years of experience building backend systems, distributed infrastructure, and fullstack applications. I work with Go, TypeScript, Node.js, and PostgreSQL to turn complex requirements into reliable software.",
  location:
    "Ho Chi Minh City, Vietnam · Open to on-site, hybrid, and remote opportunities",
  coverLetter: [
    "I am a software engineer with five years of experience developing web applications, backend services, and blockchain infrastructure. My work spans API design, real-time systems, event pipelines, and database optimization, including re-engineering a database to improve query performance by 50%.",
    "I have built products with Go, TypeScript, NestJS, and PostgreSQL, implemented Kafka event pipelines, and delivered authentication, payments, and real-time messaging. More recently, I have been building fullstack applications with Next.js and integrating AI into learning and content tools. I am looking for an opportunity to contribute this experience to a team building useful, reliable software.",
  ],
  videos: [{ id: "cXhYkK5F4j4", title: "Introduction" }],
  videoLabel: "Software engineering",
  profileLink: { href: "/coding", label: "Explore my engineering experience" },
  email: "nthanhatee@gmail.com",
  linkedIn: "https://www.linkedin.com/in/nhatthanhvo/",
  cvHref: "/content/coding/Thanh_SE_CV.pdf",
  welcomeMessage:
    "Hi, ask me about Thanh's software engineering experience, backend systems, and projects.",
} as const satisfies ResumeProfile;
