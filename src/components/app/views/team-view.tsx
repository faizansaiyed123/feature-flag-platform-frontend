"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Membership, Role } from "@/lib/types";
import { initials } from "@/lib/utils";
import { useWorkspace } from "../workspace-provider";

const roles: Role[] = ["owner","admin","member","viewer"];

export function TeamView(){
  const {activeOrganizationId,user}=useWorkspace(); const [members,setMembers]=useState<Membership[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  async function load(){if(!activeOrganizationId){setMembers([]);setLoading(false);return;}setLoading(true);try{setMembers(await api.get<Membership[]>(`/organizations/${activeOrganizationId}/members`));}catch(err){setError(err instanceof Error?err.message:"Unable to load members");}finally{setLoading(false);}}
  useEffect(()=>{void load();},[activeOrganizationId]);
  async function changeRole(member:Membership,role:Role){try{await api.patch(`/organizations/${activeOrganizationId}/members/${member.user_id}`,{role});await load();}catch(err){setError(err instanceof Error?err.message:"Unable to change role");}}
  async function remove(member:Membership){if(!window.confirm(`Remove ${member.email} from this workspace?`))return;try{await api.delete(`/organizations/${activeOrganizationId}/members/${member.user_id}`);await load();}catch(err){setError(err instanceof Error?err.message:"Unable to remove member");}}
  return <div className="page-content"><div className="page-head"><div><p className="eyebrow">Access control</p><h1>Team access</h1><p>Manage workspace membership using owner, admin, member, and viewer roles.</p></div></div>{error&&<div className="error-box" style={{marginBottom:12}}>{error}</div>}<div className="panel">{loading?<div className="loading">Loading team…</div>:<div className="table-wrap"><table><thead><tr><th>Member</th><th>Role</th><th>Access</th><th /></tr></thead><tbody>{members.map(m=><tr key={m.id}><td><div className="flag-name"><span className="avatar">{initials(m.display_name)}</span><div><strong>{m.display_name}</strong><div className="flag-key">{m.email}</div></div></div></td><td><span className="badge">{m.role}</span></td><td>{m.role==="viewer"?"Read-only":"Can manage project controls"}</td><td>{m.user_id===user?.id&&m.role==="owner"?<span className="muted">You · owner</span>:<div className="row-actions"><select className="text-button" value={m.role} onChange={e=>void changeRole(m,e.target.value as Role)}>{roles.map(role=><option key={role}>{role}</option>)}</select><button className="text-button" onClick={()=>void remove(m)}>Remove</button></div>}</td></tr>)}</tbody></table>{!members.length&&<div className="empty-state"><h3>No members found</h3><p>The active workspace does not have a membership list yet.</p></div>}</div>}</div><div className="notice" style={{marginTop:12}}>Invitation delivery is intentionally not faked: membership changes only act on accounts already created in the platform.</div></div>;
}
