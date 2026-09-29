"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", display_name: "", organization_name: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  function update(key: keyof typeof form, value: string) { setForm(prev => ({ ...prev, [key]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); setBusy(true); try { await api.post("/auth/signup", form); router.replace("/app"); } catch (err) { setError(err instanceof ApiError ? err.detail : "Unable to create the workspace"); } finally { setBusy(false); } }
  return <div className="auth-page">
    <aside className="auth-aside"><Link href="/" className="brand-lockup"><span className="brand-mark">ƒ</span><span>Flagship</span></Link><div className="auth-aside-content"><div className="eyebrow eyebrow-light">Start with a clean control plane</div><h1>One workspace for every release decision.</h1><p>Create your first organization, project, and environment, then start controlling runtime behavior with real API-backed flags.</p><div className="auth-aside-list"><div>01 · Create a workspace</div><div>02 · Define environments</div><div>03 · Ship your first flag</div></div></div><span className="form-note">No payment details · Self-host friendly</span></aside>
    <main className="auth-card-wrap"><div className="auth-card"><h2>Create your workspace</h2><p className="muted">You’ll become the owner of the new organization.</p><form className="form-grid" onSubmit={submit}><div className="field"><label htmlFor="display">Your name</label><input id="display" value={form.display_name} onChange={e=>update("display_name",e.target.value)} required minLength={2} /></div><div className="field"><label htmlFor="org">Organization</label><input id="org" value={form.organization_name} onChange={e=>update("organization_name",e.target.value)} required minLength={2} /></div><div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={form.email} onChange={e=>update("email",e.target.value)} required /></div><div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" value={form.password} onChange={e=>update("password",e.target.value)} required minLength={8} /><span className="form-note" style={{textAlign:"left"}}>At least 8 characters.</span></div>{error && <div className="error-box">{error}</div>}<div className="form-actions"><button className="button button-primary full" disabled={busy}>{busy ? "Creating…" : "Create workspace"}</button><div className="auth-footer">Already have an account? <Link href="/login">Sign in</Link></div></div></form></div></main>
  </div>;
}
