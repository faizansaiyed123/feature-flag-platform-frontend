"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Condition, Segment } from "@/lib/types";
import { displayJson, parseJsonValue } from "@/lib/utils";
import { useWorkspace } from "../workspace-provider";

const operators: Condition["operator"][] = ["equals", "not_equals", "in", "not_in", "contains", "starts_with", "ends_with", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "exists"];

function ConditionsEditor({ conditions, onChange }: { conditions: Condition[]; onChange: (next: Condition[]) => void }) {
  return <div>
    {conditions.map((condition, index) => <div className="condition-row" key={index}>
      <input placeholder="attribute" value={condition.attribute} onChange={e => onChange(conditions.map((x, i) => i===index ? {...x, attribute:e.target.value}:x))} />
      <select value={condition.operator} onChange={e => onChange(conditions.map((x, i) => i===index ? {...x, operator:e.target.value as Condition["operator"]}:x))}>{operators.map(op=><option key={op}>{op}</option>)}</select>
      <input placeholder="value / JSON" value={typeof condition.value === "string" ? condition.value : displayJson(condition.value)} onChange={e => onChange(conditions.map((x, i) => i===index ? {...x, value:parseJsonValue(e.target.value)}:x))} />
      <button className="icon-button" type="button" onClick={()=>onChange(conditions.filter((_,i)=>i!==index))}>×</button>
    </div>)}
    <button className="text-button" type="button" onClick={()=>onChange([...conditions,{attribute:"",operator:"equals",value:""}])}>+ Add condition</button>
  </div>;
}

export function SegmentsView() {
  const { activeProjectId } = useWorkspace();
  const [segments,setSegments]=useState<Segment[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [showCreate,setShowCreate]=useState(false); const [editing,setEditing]=useState<Segment|null>(null); const [saving,setSaving]=useState(false);

  async function load(){ if(!activeProjectId){setSegments([]);setLoading(false);return;} setLoading(true); try{setSegments(await api.get<Segment[]>(`/projects/${activeProjectId}/segments`));}catch(err){setError(err instanceof Error?err.message:"Unable to load segments");}finally{setLoading(false);} }
  useEffect(()=>{void load();},[activeProjectId]);

  async function create(event: FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);setError("");const form=new FormData(event.currentTarget);try{await api.post(`/projects/${activeProjectId}/segments`,{key:form.get("key"),name:form.get("name"),description:form.get("description")||null,conditions:[]});setShowCreate(false);event.currentTarget.reset();await load();}catch(err){setError(err instanceof Error?err.message:"Unable to create segment");}finally{setSaving(false);}}
  async function update(event: FormEvent<HTMLFormElement>){event.preventDefault();if(!editing)return;setSaving(true);const form=new FormData(event.currentTarget);try{await api.patch(`/segments/${editing.id}`,{name:form.get("name"),description:form.get("description")||null,conditions:editing.conditions});setEditing(null);await load();}catch(err){setError(err instanceof Error?err.message:"Unable to update segment");}finally{setSaving(false);}}
  async function remove(segment:Segment){if(!window.confirm(`Delete ${segment.key}?`))return;try{await api.delete(`/segments/${segment.id}`);await load();}catch(err){setError(err instanceof Error?err.message:"Unable to delete segment");}}
  async function changeConditions(segment:Segment,next:Condition[]){setSegments(prev=>prev.map(x=>x.id===segment.id?{...x,conditions:next}:x));try{await api.patch(`/segments/${segment.id}`,{conditions:next});}catch(err){setError(err instanceof Error?err.message:"Unable to save conditions");}}

  return <div className="page-content"><div className="page-head"><div><p className="eyebrow">Audience definitions</p><h1>Segments</h1><p>Reusable user cohorts keep targeting rules readable and consistent across flags.</p></div><button className="button button-dark" disabled={!activeProjectId} onClick={()=>setShowCreate(true)}>+ New segment</button></div>
    {error&&<div className="error-box" style={{marginBottom:12}}>{error}</div>}
    {!activeProjectId?<div className="panel"><div className="empty-state"><h3>No project selected</h3><p>Create a project in Settings before defining audience segments.</p></div></div>:loading?<div className="loading">Loading segments…</div>:<div className="segment-list">{segments.map(segment=><div className="segment-card" key={segment.id}><div className="segment-card-head"><div><h3>{segment.name}</h3><p><code>{segment.key}</code> · {segment.conditions.length} condition{segment.conditions.length===1?"":"s"}</p></div><div className="row-actions"><button className="text-button" onClick={()=>setEditing(segment)}>Edit</button><button className="text-button" onClick={()=>void remove(segment)}>Delete</button></div></div><div style={{marginTop:12}}><ConditionsEditor conditions={segment.conditions} onChange={next=>void changeConditions(segment,next)} /></div>{segment.description&&<div className="notice" style={{marginTop:10}}>{segment.description}</div>}</div>)}{!segments.length&&<div className="panel"><div className="empty-state"><h3>No audience segments</h3><p>Create segments like “beta-users” or “enterprise” once and reference them from multiple flag rules.</p><button className="button button-primary" onClick={()=>setShowCreate(true)}>Create segment</button></div></div>}</div>}

    {(showCreate||editing)&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setShowCreate(false);setEditing(null);}}}><div className="modal">{showCreate&&<><div className="modal-header"><div><h2>Create segment</h2><p>Define the audience once and reuse it in targeting rules.</p></div><button className="icon-button" onClick={()=>setShowCreate(false)}>×</button></div><form onSubmit={create}><div className="modal-body form-grid"><div className="field"><label>Key</label><input name="key" required pattern="[a-z0-9][a-z0-9_-]*" placeholder="beta-users" /></div><div className="field"><label>Name</label><input name="name" required minLength={2} placeholder="Beta users" /></div><div className="field"><label>Description</label><textarea name="description" placeholder="Users enrolled in the private beta" /></div></div><div className="modal-footer"><button className="button button-ghost" type="button" onClick={()=>setShowCreate(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving?"Creating…":"Create segment"}</button></div></form></>}{editing&&<><div className="modal-header"><div><h2>Edit {editing.key}</h2><p>Change the label or description; conditions are edited inline.</p></div><button className="icon-button" onClick={()=>setEditing(null)}>×</button></div><form onSubmit={update}><div className="modal-body form-grid"><div className="field"><label>Name</label><input name="name" required defaultValue={editing.name}/></div><div className="field"><label>Description</label><textarea name="description" defaultValue={editing.description||""}/></div></div><div className="modal-footer"><button className="button button-ghost" type="button" onClick={()=>setEditing(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving?"Saving…":"Save changes"}</button></div></form></>}</div></div>}
  </div>;
}
