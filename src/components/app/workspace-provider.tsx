"use client";

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  error: string;
  setActiveOrganizationId: (id: string) => void;
  setActiveProjectId: (id: string) => void;
  setActiveEnvironmentId: (id: string) => void;
  reloadProjects: () => Promise<void>;
  reloadEnvironments: () => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function saved(key: string) {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(key) || "";
}

function remember(key: string, value: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, value);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeOrganizationId, setOrg] = useState("");
  const [activeProjectId, setProject] = useState("");
  const [activeEnvironmentId, setEnv] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const initialPath = useRef("/app");

  useEffect(() => {
    let cancelled = false;
    initialPath.current = window.location.pathname;

    (async () => {
      try {
        setError("");
        const [me, orgs] = await Promise.all([
          api.get<User>("/auth/me"),
          api.get<Organization[]>("/organizations"),
        ]);
        if (cancelled) return;

        setUser(me);
        setOrganizations(orgs);

        const orgId = orgs.find((org) => org.id === saved("ffp:org"))?.id || orgs[0]?.id || "";
        setOrg(orgId);
        remember("ffp:org", orgId);

        if (!orgId) return;

        const ps = await api.get<Project[]>(`/organizations/${orgId}/projects`);
        if (cancelled) return;
        setProjects(ps);

        const projectId =
          ps.find((project) => project.id === saved("ffp:project"))?.id || ps[0]?.id || "";
        setProject(projectId);
        remember("ffp:project", projectId);

        if (!projectId) {
          setEnvironments([]);
          setEnv("");
          remember("ffp:environment", "");
          return;
        }

        const envs = await api.get<Environment[]>(`/projects/${projectId}/environments`);
        if (cancelled) return;
        setEnvironments(envs);

        const environmentId =
          envs.find((environment) => environment.id === saved("ffp:environment"))?.id ||
          envs[0]?.id ||
          "";
        setEnv(environmentId);
        remember("ffp:environment", environmentId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(initialPath.current)}`);
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load the workspace.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function setActiveOrganizationId(id: string) {
    setError("");
    setOrg(id);
    remember("ffp:org", id);
    setProject("");
    setEnv("");
    remember("ffp:project", "");
    remember("ffp:environment", "");

    try {
      const ps = await api.get<Project[]>(`/organizations/${id}/projects`);
      setProjects(ps);
      const nextProject = ps[0]?.id || "";
      setProject(nextProject);
      remember("ffp:project", nextProject);

      if (!nextProject) {
        setEnvironments([]);
        return;
      }

      const es = await api.get<Environment[]>(`/projects/${nextProject}/environments`);
      setEnvironments(es);
      const nextEnvironment = es[0]?.id || "";
      setEnv(nextEnvironment);
      remember("ffp:environment", nextEnvironment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to switch workspace.");
    }
  }

  async function setActiveProjectId(id: string) {
    setError("");
    setProject(id);
    remember("ffp:project", id);
    setEnv("");
    remember("ffp:environment", "");

    if (!id) {
      setEnvironments([]);
      return;
    }

    try {
      const es = await api.get<Environment[]>(`/projects/${id}/environments`);
      setEnvironments(es);
      const nextEnvironment = es[0]?.id || "";
      setEnv(nextEnvironment);
      remember("ffp:environment", nextEnvironment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to switch project.");
    }
  }

  function setActiveEnvironmentId(id: string) {
    setEnv(id);
    remember("ffp:environment", id);
  }

  async function reloadProjects() {
    if (!activeOrganizationId) return;
    const ps = await api.get<Project[]>(`/organizations/${activeOrganizationId}/projects`);
    setProjects(ps);
  }

  async function reloadEnvironments() {
    if (!activeProjectId) return;
    const es = await api.get<Environment[]>(`/projects/${activeProjectId}/environments`);
    setEnvironments(es);
    if (!es.some((environment) => environment.id === activeEnvironmentId)) {
      const next = es[0]?.id || "";
      setEnv(next);
      remember("ffp:environment", next);
    }
  }

  const value: WorkspaceContextValue = {
    user,
    organizations,
    projects,
    environments,
    activeOrganizationId,
    activeProjectId,
    activeEnvironmentId,
    activeOrganization: organizations.find((org) => org.id === activeOrganizationId) || null,
    activeProject: projects.find((project) => project.id === activeProjectId) || null,
    activeEnvironment:
      environments.find((environment) => environment.id === activeEnvironmentId) || null,
    error,
    setActiveOrganizationId,
    setActiveProjectId,
    setActiveEnvironmentId,
    reloadProjects,
    reloadEnvironments,
    loading,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}
