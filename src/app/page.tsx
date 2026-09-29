import Link from "next/link";

const highlights = [
  ["Deterministic evaluation", "Same context, same result. Target users safely without inconsistent rollout behavior."],
  ["Environment isolation", "Keep development, staging, and production state separate with revocable SDK keys."],
  ["Safe rollout simulator", "Preview targeting and percentage rollouts against realistic user contexts before shipping."],
];

export default function Home() {
  return (
    <main className="marketing">
      <nav className="marketing-nav shell-wide">
        <Link href="/" className="brand-lockup"><span className="brand-mark">ƒ</span><span>Flagship</span></Link>
        <div className="nav-links">
          <a href="#features">Capabilities</a>
          <a href="#workflow">Workflow</a>
          <Link href="/login" className="nav-login">Sign in</Link>
          <Link href="/signup" className="button button-dark button-small">Create workspace</Link>
        </div>
      </nav>

      <section className="hero-marketing shell-wide">
        <div className="hero-copy">
          <div className="eyebrow eyebrow-light">Feature delivery infrastructure</div>
          <h1>Ship code once.<br /><em>Control behavior</em> at runtime.</h1>
          <p className="hero-text">A developer-first feature flag platform for targeted releases, gradual rollouts, environment isolation, and safer operational changes.</p>
          <div className="hero-actions">
            <Link href="/signup" className="button button-primary">Start building free <span>→</span></Link>
            <a href="#workflow" className="button button-ghost">See how it works</a>
          </div>
          <div className="hero-proof"><span className="status-dot" /> No third-party feature service required. PostgreSQL + FastAPI + Next.js.</div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="glow-orb" />
          <div className="console-card">
            <div className="console-top"><span>checkout / production</span><span className="tiny-pill">LIVE</span></div>
            <div className="flag-preview">
              <div><span className="flag-icon">✦</span><strong>checkout.redesign</strong></div>
              <span className="toggle on"><span /></span>
            </div>
            <div className="rule-preview"><span className="rule-number">01</span><div><b>plan</b> equals <mark>pro</mark><br /><small>Serve “new-checkout”</small></div></div>
            <div className="rule-preview"><span className="rule-number">02</span><div><b>Rollout</b> <mark>25%</mark><br /><small>Deterministic by user ID</small></div></div>
            <div className="eval-line"><span /> Evaluation: <b>new-checkout</b></div>
          </div>
        </div>
      </section>

      <section id="features" className="feature-strip shell-wide">
        {highlights.map(([title, body], index) => (
          <article key={title} className="feature-card">
            <span className="feature-index">0{index + 1}</span>
            <h2>{title}</h2><p>{body}</p>
          </article>
        ))}
      </section>

      <section id="workflow" className="workflow-section shell-wide">
        <div className="section-intro"><div className="eyebrow">One control plane</div><h2>Release with intent, not hope.</h2><p>Model your workspace, keep every environment explicit, and put evaluation logic in one reusable engine.</p></div>
        <div className="workflow-grid">
          <div className="workflow-step"><span>01</span><h3>Create a flag</h3><p>Define a typed value and a stable key. Keep product logic decoupled from release timing.</p></div>
          <div className="workflow-step"><span>02</span><h3>Target a segment</h3><p>Compose attribute conditions and reusable audience segments without hard-coding user lists.</p></div>
          <div className="workflow-step"><span>03</span><h3>Roll out safely</h3><p>Use deterministic percentages and the simulator to preview real cohorts before production.</p></div>
          <div className="workflow-step"><span>04</span><h3>Audit the change</h3><p>Every workspace change is visible in an immutable operational timeline.</p></div>
        </div>
      </section>

      <section className="cta-section shell-wide">
        <div><div className="eyebrow eyebrow-light">Built for engineers</div><h2>Your release process deserves a control plane.</h2></div>
        <Link href="/signup" className="button button-primary">Create your workspace <span>→</span></Link>
      </section>

      <footer className="marketing-footer shell-wide"><span>Flagship Feature Flag Platform</span><span>Runtime delivery · Targeting · Rollouts · Auditability</span></footer>
    </main>
  );
}
