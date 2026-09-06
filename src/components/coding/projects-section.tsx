"use client";

import Image from "next/image";
import { useState } from "react";
import type { Project } from "../../../content/coding/types";

type ProjectCategory = "enterprise" | "personal";

type ProjectsSectionProps = {
  enterpriseProjects: readonly Project[];
  personalProjects: readonly Project[];
};

const categoryLabels: Record<ProjectCategory, string> = {
  enterprise: "Enterprise",
  personal: "Personal projects",
};

export function ProjectsSection({
  enterpriseProjects,
  personalProjects,
}: ProjectsSectionProps) {
  const [activeCategory, setActiveCategory] =
    useState<ProjectCategory>("enterprise");
  const projects =
    activeCategory === "enterprise" ? enterpriseProjects : personalProjects;

  return (
    <section
      className="coding-projects section-shell"
      aria-labelledby="projects-title"
    >
      <div className="coding-projects-header">
        <h2 id="projects-title">Projects</h2>

        <div className="project-tabs" role="tablist" aria-label="Project type">
          {(Object.keys(categoryLabels) as ProjectCategory[]).map(
            (category) => (
              <button
                aria-controls="projects-panel"
                aria-selected={activeCategory === category}
                className={activeCategory === category ? "active" : ""}
                id={`${category}-projects-tab`}
                key={category}
                onClick={() => setActiveCategory(category)}
                role="tab"
                type="button"
              >
                {categoryLabels[category]}
              </button>
            ),
          )}
        </div>
      </div>

      <div
        aria-labelledby={`${activeCategory}-projects-tab`}
        className="project-list"
        id="projects-panel"
        key={activeCategory}
        role="tabpanel"
      >
        {projects.map((project) => {
          const results = project.results.filter(Boolean);

          return (
            <article className="project-card" key={project.id}>
              <div className="project-media">
                <Image
                  alt={`${project.name} project preview`}
                  fill
                  sizes="(max-width: 860px) calc(100vw - 2.5rem), 50vw"
                  src={project.image}
                />
              </div>

              <div className="project-content">
                <p className="project-industry">{project.industry}</p>
                <h3>{project.name}</h3>
                <p className="project-meta">
                  <span>{project.organization}</span>
                  <span aria-hidden="true">·</span>
                  <span>{project.timeline.replace(/[—–]/g, "-")}</span>
                </p>
                <p className="project-description">{project.description}</p>

                <div className="project-contributions">
                  <h4>What I did</h4>
                  <ul>
                    {project.role.map((contribution) => (
                      <li key={contribution}>{contribution}</li>
                    ))}
                  </ul>
                </div>

                {results.length > 0 ? (
                  <div className="project-results" aria-label="Project results">
                    {results.map((result) => (
                      <span key={result}>{result}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
