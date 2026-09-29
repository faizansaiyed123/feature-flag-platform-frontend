"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api";
import type { Environment, Organization, Project, User } from "@/lib/types";

interface WorkspaceContextValue {
  user: User | null;
  organizations: Organization[];
  projects: Project[];
  environments: Environment[];
  activeOrganizationId: string;
  activeProjectId: string;
  activeEnvironmentId: string;
  activeOrganization: Organization | null;
  activeProject: Project | null;
  activeEnvironment: Environment | null;
  setActiveOrganizationId: (id: string) => void;
  setActiveProjectId: (id: string) => void;
  setActiveEnvironmentId: (id: string) => void;
  reloadProjects: () => Promise<void>;
  reloadEnvironments: () => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function saved(key: string) { return typeof window === "undefined" ? "" : localStorage.getItem(key) || ""; }
function remember(key: string, value: string) { if (typeof window !== "undefined") localStorage.setItem(key, value); }

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter(); const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null); const [organizations, setOrganizations] = useState<Organization[]>([]); const [projects, setProjects] = useState<Project[]>([]); const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeOrganizationId, setOrg] = useState(""); const [activeProjectId, setProject] = useState(""); const [activeEnvironmentId, setEnv] = useState(""); const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, orgs] = await Promise.all([api.get<User>("/auth/me"), api.get<Organization[]>("/organizations")]);
        if (cancelled) return;
        setUser(me); setOrganizations(orgs);
        const orgId = orgs.find(o => o.id === saved("ffp:org"))?.id || orgs[0]?.id || "";
        setOrg(orgId);
        if (!orgId) { setLoading(false); return; }
        remember("ffp:org", orgId);
        const ps = await api.get<Project[]>(`/organizations/${orgId}/projects`);
        if (cancelled) return;
        setProjects(ps); const projectId = ps.find(p => p.id === saved("ffp:project"))?.id || ps[0]?.id || ""; setProject(projectId); remember("ffp:project", projectId);
        if (projectId) { const envs = await api.get<Environment[]>(`/projects/${projectId}/environments`); if (!cancelled) { setEnvironments(envs); const envId = envs.find(e => e.id === saved("ffp:environment"))?.id || envs[0]?.id || ""; setEnv(envId); remember("ffp:environment", envId); } }
      } catch (err) { if (err instanceof ApiError && err.status === 401) router.replace(`/login?next=${encodeURIComponent(pathname)}`); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router, pathname]);

  function setActiveOrganizationId(id: string) { setOrg(id); remember("ffp:org", id); setProject(""); setEnv(""); remember("ffp:project", ""); remember("ffp:environment", ""); void api.get<Project[]>(`/organizations/${id}/projects`).then(ps => { setProjects(ps); const next = ps[0]?.id || ""; setProject(next); remember("ffp:project", next); if (next) void api.get<Environment[]>(`/projects/${next}/environments`).then(es => { setEnvironments(es); const env = es[0]?.id || ""; setEnv(env); remember("ffp:environment", env); }); else setEnvironments([]); }); }
  function setActiveProjectId(id: string) { setProject(id); remember("ffp:project", id); setEnv(""); remember("ffp:environment", ""); void api.get<Environment[]>(`/projects/${id}/environments`).then(es => { setEnvironments(es); const env = es[0]?.id || ""; setEnv(env); remember("ffp:environment", env); }); }
  function setActiveEnvironmentId(id: string) { setEnv(id); remember("ffp:environment", id); }
  async function reloadProjects() { if (!activeOrganizationId) return; const ps = await api.get<Project[]>(`/organizations/${activeOrganizationId}/projects`); setProjects(ps); }
  async function reloadEnvironments() { if (!activeProjectId) return; const es = await api.get<Environment[]>(`/projects/${activeProjectId}/environments`); setEnvironments(es); if (!es.some(e => e.id === activeEnvironmentId)) { const next = es[0]?.id || ""; setEnv(next); remember("ffp:environment", next); } }

  const value = useMemo(() => ({ user, organizations, projects, environments, activeOrganizationId, activeProjectId, activeEnvironmentId, activeOrganization: organizations.find(o=>o.id===activeOrganizationId)||null, activeProject: projects.find(p=>p.id===activeProjectId)||null, activeEnvironment: environments.find(e=>e.id===activeEnvironmentId)||null, setActiveOrganizationId, setActiveProjectId, setActiveEnvironmentId, reloadProjects, reloadEnvironments, loading }), [user, organizations, projects, environments, activeOrganizationId, activeProjectId, activeEnvironmentId, loading]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() { const value = useContext(WorkspaceContext); if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider"); return value; }
