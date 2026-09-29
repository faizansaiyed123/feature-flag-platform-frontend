"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AuditLog } from "@/lib/types";
import { displayJson, formatRelativeTime } from "@/lib/utils";
import { useWorkspace } from "../workspace-provider";

export function AuditView(){const {activeProjectId}=useWorkspace();const[logs,setLogs]=useState<AuditLog[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState("");useEffect(()=>{if(!activeProjectId){setLogs([]);setLoading(false);return;}setLoading(true);api.get<AuditLog[]>(`/projects/${activeProjectId}/audit-logs?limit=200`).then(setLogs).catch(e=>setError(e instanceof Error?e.message:"Unable to load audit logs")).finally(()=>setLoading(false));},[activeProjectId]);return <div className="page-content"><div className="page-head"><div><p className="eyebrow">Change history</p><h1>Audit log</h1><p>Review control-plane changes with actor, entity, and structured details.</p></div></div>{error&&<div className="error-box" style={{marginBottom:12}}>{error}</div>}<div className="panel">{loading?<div className="loading">Loading history…</div>:<div className="audit-list">{logs.map(log=><div className="audit-row" key={log.id}><div className="audit-time">{formatRelativeTime(log.created_at)}</div><div><div className="audit-action">{log.action}</div><div className="audit-detail">{log.entity_type}{log.entity_id?` · ${log.entity_id}`:""}</div></div><code className="flag-key">{displayJson(log.details)}</code></div>)}{!logs.length&&<div className="empty-state"><h3>No changes recorded</h3><p>Changes to projects, flags, targeting, and memberships will appear here.</p></div>}</div>}</div></div>}
