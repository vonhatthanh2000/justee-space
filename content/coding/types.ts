import type { StaticImageData } from "next/image";

export type Project = {
  id: number;
  industry: string;
  name: string;
  organization: string;
  timeline: string;
  description: string;
  /** Bullet points under "What I did" */
  role: readonly string[];
  results: readonly string[];
  href: string;
  image: StaticImageData;
};

export type Skill = {
  category: string;
  detail: string;
};

export type ExperienceEntry = {
  id: number;
  period: string;
  title: string;
  organization: string;
  /** Projects at this role — each key is a project name, value is bullet points */
  description: Readonly<Record<string, readonly string[]>>;
  /** Tech stack per project — keys should match `description` project names */
  techstack?: Readonly<Record<string, readonly string[]>>;
};
