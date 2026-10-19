"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const {
    user,
    organizations,
    activeOrganizationId,
    setActiveOrganizationId,
    activeProject,
    projects,
    activeProjectId,
    setActiveProjectId,
    environments,
    activeEnvironmentId,
    setActiveEnvironmentId,
    error,
    loading,
  } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      router.replace("/");
    }
  }

  if (loading) return <div className="loading">Loading workspace…</div>;
  if (!user) return null;

  return (
    <div className="app-body">
      <div className={`console-layout ${mobileNavOpen ? "mobile-nav-open" : ""}`}>
        <aside className="sidebar" aria-label="Workspace navigation">
          <div className="sidebar-mobile-head">
            <Link href="/" className="brand-lockup">
              <span className="brand-mark">ƒ</span>
              <span>Flagship</span>
            </Link>
            <button
              className="mobile-nav-toggle"
              type="button"
              aria-expanded={mobileNavOpen}
              aria-controls="workspace-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? "Close" : "Menu"}
            </button>
          </div>

          <div className="sidebar-brand">
            <Link href="/" className="brand-lockup">
              <span className="brand-mark">ƒ</span>
              <span>Flagship</span>
            </Link>
          </div>

          <div className="workspace-picker">
            <label htmlFor="workspace-select">Workspace</label>
            <select
              id="workspace-select"
              value={activeOrganizationId}
              onChange={(event) => void setActiveOrganizationId(event.target.value)}
              disabled={!organizations.length}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="nav-section-label">Control plane</div>
          <nav className="side-nav" id="workspace-navigation" aria-label="Control plane">
            {navigation.map((item) => {
              const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={active ? "active" : ""}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-spacer" />
          <div className="sidebar-user">
            <div className="avatar">{initials(user.display_name)}</div>
            <div className="sidebar-user-text">
              <strong>{user.display_name}</strong>
              <span>{user.email}</span>
            </div>
            <button className="logout-button" aria-label="Sign out" onClick={() => void logout()}>↗</button>
          </div>
        </aside>

        <main className="console-main">
          <header className="topbar">
            <div className="topbar-title">
              <strong>{activeProject?.name || "No project"}</strong>
              {activeProject?.key && <span>/{activeProject.key}</span>}
            </div>

            <div className="env-picker">
              <label htmlFor="environment-select">Environment</label>
              <select
                id="environment-select"
                value={activeEnvironmentId}
                onChange={(event) => setActiveEnvironmentId(event.target.value)}
                disabled={!environments.length}
              >
                <option value="">Select…</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}{env.is_protected ? " · protected" : ""}
                  </option>
                ))}
              </select>
              <select
                value={activeProjectId}
                onChange={(event) => void setActiveProjectId(event.target.value)}
                disabled={!projects.length}
                aria-label="Project"
              >
                <option value="">Project…</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </div>
          </header>

          {error && (
            <div className="workspace-alert" role="alert">
              <span>{error}</span>
              <button type="button" className="text-button" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
