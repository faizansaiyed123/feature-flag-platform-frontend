"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { FeatureFlag, Environment } from "@/lib/types";
import { displayJson } from "@/lib/utils";
import { useWorkspace } from "../workspace-provider";

interface SimulationRow { user_id: string | null; value: unknown; reason: string; matched_rule_id: string | null; }
interface SimulationResponse { flag_key: string; environment_key: string; version: number; results: SimulationRow[]; }

const sampleUsers = `[{"user_id":"user-001","attributes":{"plan":"pro","country":"IN"}},{"user_id":"user-002","attributes":{"plan":"free","country":"IN"}},{"user_id":"user-003","attributes":{"plan":"pro","country":"US"}}]`;

export function SimulatorView() {
  const { activeProject, activeProjectId, activeEnvironmentId, environments } = useWorkspace();
  const [flags,setFlags]=useState<FeatureFlag[]>([]); const [flagKey,setFlagKey]=useState(""); const [json,setJson]=useState(sampleUsers); const [results,setResults]=useState<SimulationResponse|null>(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  useEffect(()=>{ if(!activeProjectId){setFlags([]);setFlagKey("");return;} void api.get<FeatureFlag[]>(`/projects/${activeProjectId}/flags`).then(data=>{setFlags(data);setFlagKey(prev=>data.some(x=>x.key===prev)?prev:data[0]?.key||"");}).catch(err=>setError(err instanceof Error?err.message:"Unable to load flags")); },[activeProjectId]);
  const activeEnv=useMemo(()=>environments.find(e=>e.id===activeEnvironmentId),[environments,activeEnvironmentId]);
  async function run(){setLoading(true);setError("");setResults(null);try{const users=JSON.parse(json);if(!Array.isArray(users)||users.length===0)throw new Error("Users JSON must be a non-empty array");setResults(await api.post<SimulationResponse>(`/projects/${activeProjectId}/simulate`,{environment_id:activeEnvironmentId,flag_key:flagKey,users}));}catch(err){setError(err instanceof Error?err.message:"Unable to simulate");}finally{setLoading(false);}}

  return <div className="page-content"><div className="page-head"><div><p className="eyebrow">Deterministic preview</p><h1>Rollout simulator</h1><p>Test real evaluation logic against representative users before changing production behavior.</p></div><span className="badge">No SDK key required</span></div>
    {error&&<div className="error-box" style={{marginBottom:12}}>{error}</div>}
    <div className="simulator-grid"><div className="panel"><div className="panel-head"><strong>Simulation input</strong><span className="muted">{activeEnv?.name||"No environment"}</span></div><div className="panel-body form-grid"><div className="field"><label>Environment</label><select value={activeEnvironmentId} disabled><option value="">Select an environment</option>{environments.map(e=><option key={e.id} value={e.id}>{e.name} ({e.key})</option>)}</select></div><div className="field"><label>Feature flag</label><select value={flagKey} onChange={e=>setFlagKey(e.target.value)}><option value="">Select a flag</option>{flags.map(f=><option key={f.key} value={f.key}>{f.name} · {f.key}</option>)}</select></div><div className="field"><label>Users JSON</label><textarea style={{minHeight:280,fontFamily:"ui-monospace,SFMono-Regular,Menlo,monospace",fontSize:11}} value={json} onChange={e=>setJson(e.target.value)} spellCheck={false}/></div><button className="button button-dark full" disabled={loading||!activeProjectId||!activeEnvironmentId||!flagKey} onClick={()=>void run()}>{loading?"Evaluating…":"Run simulation"}</button></div></div>
      <div><div className="panel"><div className="panel-head"><strong>Decision trace</strong><span className="muted">{results?`${results.results.length} users · v${results.version}`:"Waiting for a run"}</span></div><div className="panel-body">{!results?<div className="empty-state"><h3>See every user decision</h3><p>The simulator uses the same conditions, segments and deterministic rollout bucket used by the SDK evaluation endpoint.</p></div>:<div className="table-wrap"><table><thead><tr><th>User</th><th>Value</th><th>Reason</th><th>Matched rule</th></tr></thead><tbody>{results.results.map((row,i)=><tr key={`${row.user_id}-${i}`}><td><strong>{row.user_id||"anonymous"}</strong></td><td><code>{displayJson(row.value)}</code></td><td><span className={`badge ${row.reason==="targeting_rule"||row.reason==="rollout"?"live":""}`}>{row.reason}</span></td><td className="flag-key">{row.matched_rule_id||"—"}</td></tr>)}</tbody></table></div>}</div></div>{activeProject&&<div className="notice" style={{marginTop:12}}>Project <strong>{activeProject.key}</strong> · evaluations remain server-side and reuse the production decision engine.</div>}</div></div>
  </div>;
}
