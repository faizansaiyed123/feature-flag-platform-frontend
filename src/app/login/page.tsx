"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await api.post("/auth/login", { email, password }); router.replace("/app"); }
    catch (err) { setError(err instanceof ApiError ? err.detail : "Unable to sign in"); }
    finally { setBusy(false); }
  }

  return <div className="auth-page">
    <aside className="auth-aside"><Link href="/" className="brand-lockup"><span className="brand-mark">ƒ</span><span>Flagship</span></Link><div className="auth-aside-content"><div className="eyebrow eyebrow-light">Runtime delivery</div><h1>Turn risky releases into controlled changes.</h1><p>Keep product behavior behind typed flags, target specific users, and promote changes environment by environment.</p><div className="auth-aside-list"><div>✓ Deterministic targeting engine</div><div>✓ Environment-specific state</div><div>✓ Operational audit history</div></div></div><span className="form-note">Feature Flag Platform · Built with open technologies</span></aside>
    <main className="auth-card-wrap"><div className="auth-card"><h2>Welcome back</h2><p className="muted">Sign in to your workspace.</p><form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div><div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>{error && <div className="error-box">{error}</div>}<div className="form-actions"><button className="button button-dark full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button><div className="auth-footer">New here? <Link href="/signup">Create an account</Link></div></div></form></div></main>
  </div>;
}
