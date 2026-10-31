"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="system-page">
      <div className="system-card">
        <div className="eyebrow">Something went wrong</div>
        <h1>We couldn’t load this page.</h1>
        <p>Try again. If the problem continues, check the API status and application logs.</p>
        <button className="button button-dark" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
