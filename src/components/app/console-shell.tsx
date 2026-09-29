"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { initials } from "@/lib/utils";
import { useWorkspace } from "./workspace-provider";

const navigation = [
  { href: "/app", label: "Overview" },
  { href: "/app/flags", label: "Feature flags" },
  { href: "/app/segments", label: "Segments" },
  { href: "/app/simulator", label: "Rollout simulator" },
  { href: "/app/team", label: "Team access" },
  { href: "/app/audit", label: "Audit log" },
  { href: "/app/api", label: "API & SDK" },
  { href: "/app/settings", label: "Settings" },
];

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { user, organizations, activeOrganizationId, setActiveOrganizationId, activeProject, projects, activeProjectId, setActiveProjectId, environments, activeEnvironmentId, setActiveEnvironmentId, loading } = useWorkspace();
  const pathname = usePathname(); const router = useRouter();
  if (loading) return <div className="loading">Loading workspace…</div>;
  if (!user) return null;
  return <div className="app-body"><div className="console-layout">
    <aside className="sidebar">
      <div className="sidebar-brand"><Link href="/" className="brand-lockup"><span className="brand-mark">ƒ</span><span>Flagship</span></Link></div>
      <div className="workspace-picker"><label>Workspace</label><select value={activeOrganizationId} onChange={e=>setActiveOrganizationId(e.target.value)}>{organizations.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
      <div className="nav-section-label">Control plane</div><nav className="side-nav">{navigation.map(item => <Link key={item.href} href={item.href} className={pathname===item.href || (item.href!=="/app" && pathname.startsWith(item.href)) ? "active" : ""}>{item.label}</Link>)}</nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-user"><div className="avatar">{initials(user.display_name)}</div><div className="sidebar-user-text"><strong>{user.display_name}</strong><span>{user.email}</span></div><button className="logout-button" aria-label="Sign out" onClick={async()=>{ await api.post("/auth/logout"); router.replace("/"); }}>↗</button></div>
    </aside>
    <main className="console-main">
      <header className="topbar"><div className="topbar-title"><strong>{activeProject?.name || "No project"}</strong>{activeProject?.key && <span>/{activeProject.key}</span>}</div><div className="env-picker"><label>Environment</label><select value={activeEnvironmentId} onChange={e=>setActiveEnvironmentId(e.target.value)} disabled={!environments.length}><option value="">Select…</option>{environments.map(env=><option key={env.id} value={env.id}>{env.name}{env.is_protected ? " · protected" : ""}</option>)}</select><select value={activeProjectId} onChange={e=>setActiveProjectId(e.target.value)} disabled={!projects.length} aria-label="Project"><option value="">Project…</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></div></header>
      {children}
    </main>
  </div></div>;
}
