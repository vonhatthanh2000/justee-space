import type { ExperienceEntry } from "../../../content/coding/types";

type ExperienceSectionProps = {
  entries: readonly ExperienceEntry[];
};

export function ExperienceSection({ entries }: ExperienceSectionProps) {
  return (
    <section
      className="coding-experience section-shell"
      aria-labelledby="experience-title"
    >
      <h2 id="experience-title">Experiences</h2>

      <ol className="experience-timeline">
        {entries.map((entry) => (
          <li className="experience-entry" key={entry.id}>
            <div className="experience-period">
              <span>{entry.period.replace(/[—–]/g, "-")}</span>
            </div>

            <article className="experience-content">
              <header>
                <h3>{entry.title}</h3>
                <p>{entry.organization}</p>
              </header>

              <div className="experience-projects">
                {Object.entries(entry.description).map(
                  ([projectName, contributions]) => {
                    const technologies = entry.techstack?.[projectName] ?? [];

                    return (
                      <div className="experience-project" key={projectName}>
                        <h4>{projectName}</h4>
                        <ul>
                          {contributions.map((contribution) => (
                            <li key={contribution}>{contribution}</li>
                          ))}
                        </ul>

                        {technologies.length > 0 ? (
                          <div
                            className="experience-tech"
                            aria-label={`${projectName} technologies`}
                          >
                            {technologies.map((technology) => (
                              <span key={technology}>{technology}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  },
                )}
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
