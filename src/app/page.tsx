const phases = [
  "Foundation",
  "Database",
  "Authentication",
  "Organizations & Projects",
  "Feature Flags",
  "Evaluation Engine",
  "Safe Rollout Simulator",
  "Dashboard & QA",
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Feature Flag Platform</p>
        <h1 id="page-title">A real feature-flag system, built from the foundation up.</h1>
        <p className="lede">
          The application shell is intentionally limited at this stage. Product screens will be
          connected to real FastAPI and PostgreSQL contracts as each domain is implemented.
        </p>
      </section>

      <section className="roadmap" aria-labelledby="roadmap-title">
        <div className="section-heading">
          <p className="eyebrow">Development sequence</p>
          <h2 id="roadmap-title">Build order</h2>
        </div>
        <ol>
          {phases.map((phase, index) => (
            <li key={phase}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {phase}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
