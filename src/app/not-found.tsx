import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-page">
      <div className="system-card">
        <div className="eyebrow">404</div>
        <h1>That page doesn’t exist.</h1>
        <p>The link may be outdated or the resource may have moved.</p>
        <Link className="button button-dark" href="/">Return home</Link>
      </div>
    </main>
  );
}
