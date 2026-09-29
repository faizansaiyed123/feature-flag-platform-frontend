"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { Condition, FeatureFlag, FlagType, Segment, TargetingRule } from "@/lib/types";
import { displayJson, parseJsonValue } from "@/lib/utils";
import { useWorkspace } from "../workspace-provider";

const operators: Condition["operator"][] = ["equals", "not_equals", "in", "not_in", "contains", "starts_with", "ends_with", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "exists"];

function defaultValue(type: FlagType): unknown {
  return type === "boolean" ? false : type === "number" ? 0 : type === "json" ? {} : "";
}

function valueForInput(value: unknown) {
  return typeof value === "string" ? value : displayJson(value);
}

function ConditionsEditor({ conditions, onChange }: { conditions: Condition[]; onChange: (next: Condition[]) => void }) {
  return <div>
    {conditions.map((condition, index) => <div className="condition-row" key={`${index}-${condition.attribute}`}>
      <input placeholder="attribute, e.g. plan" value={condition.attribute} onChange={e => onChange(conditions.map((x, i) => i === index ? { ...x, attribute: e.target.value } : x))} />
      <select value={condition.operator} onChange={e => onChange(conditions.map((x, i) => i === index ? { ...x, operator: e.target.value as Condition["operator"] } : x))}>{operators.map(op => <option key={op}>{op}</option>)}</select>
      <input placeholder={condition.operator === "exists" ? "true / false" : "value or JSON array"} value={valueForInput(condition.value)} onChange={e => onChange(conditions.map((x, i) => i === index ? { ...x, value: parseJsonValue(e.target.value) } : x))} />
      <button className="icon-button" type="button" onClick={() => onChange(conditions.filter((_, i) => i !== index))}>×</button>
    </div>)}
    <button className="text-button" type="button" onClick={() => onChange([...conditions, { attribute: "", operator: "equals", value: "" }])}>+ Add condition</button>
  </div>;
}

export function FlagsView() {
  const { activeProjectId, activeEnvironmentId, activeEnvironment } = useWorkspace();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FeatureFlag | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!activeProjectId) { setFlags([]); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [flagData, segmentData] = await Promise.all([
        api.get<FeatureFlag[]>(`/projects/${activeProjectId}/flags`),
        api.get<Segment[]>(`/projects/${activeProjectId}/segments`),
      ]);
      setFlags(flagData); setSegments(segmentData);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load flags"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [activeProjectId]);

  const activeState = useMemo(() => (flag: FeatureFlag) => flag.environment_states.find(s => s.environment_id === activeEnvironmentId), [activeEnvironmentId]);

  async function createFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const type = String(form.get("flag_type")) as FlagType;
    try {
      await api.post(`/projects/${activeProjectId}/flags`, { key: form.get("key"), name: form.get("name"), description: form.get("description") || null, flag_type: type, default_value: parseJsonValue(String(form.get("default_value") || ""), defaultValue(type)) });
      setShowCreate(false); event.currentTarget.reset(); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create flag"); }
    finally { setSaving(false); }
  }

  async function toggleFlag(flag: FeatureFlag) {
    if (!activeEnvironmentId) return;
    const state = activeState(flag);
    const nextDefault = state?.default_value ?? defaultValue(flag.flag_type);
    try { await api.patch(`/flags/${flag.id}/environments/${activeEnvironmentId}`, { enabled: !state?.enabled, default_value: nextDefault }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to update flag"); }
  }

  async function saveFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    try { await api.patch(`/flags/${editing.id}`, { name: form.get("name"), description: form.get("description") || null }); setEditing(null); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to update flag"); }
    finally { setSaving(false); }
  }

  async function archiveFlag(flag: FeatureFlag) {
    if (!window.confirm(`Archive ${flag.key}?`)) return;
    try { await api.delete(`/flags/${flag.id}`); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to archive flag"); }
  }

  return <div className="page-content">
    <div className="page-head"><div><p className="eyebrow">Release control</p><h1>Feature flags</h1><p>Ship safely by controlling behavior without rebuilding or redeploying your application.</p></div><button className="button button-dark" disabled={!activeProjectId} onClick={() => setShowCreate(true)}>+ New flag</button></div>
    {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
    {!activeProjectId ? <div className="panel"><div className="empty-state"><h3>Create a project first</h3><p>Use Settings to create the first project and environment.</p></div></div> : loading ? <div className="loading">Loading flags…</div> : <div className="panel"><div className="panel-head"><strong>{flags.length} managed flags</strong><span className="muted">{activeEnvironment?.name || "No environment selected"}</span></div><div className="table-wrap"><table><thead><tr><th>Flag</th><th>Type</th><th>Status</th><th>Version</th><th>Rules</th><th /></tr></thead><tbody>{flags.map(flag => { const state = activeState(flag); return <tr key={flag.id}><td><div className="flag-name"><span className="flag-icon">ƒ</span><div><strong>{flag.name}</strong><div className="flag-key">{flag.key}</div></div></div></td><td><span className="badge">{flag.flag_type}</span></td><td><button className={`toggle ${state?.enabled ? "on" : ""}`} aria-label={`Toggle ${flag.key}`} onClick={() => void toggleFlag(flag)} disabled={!activeEnvironmentId}><span /></button></td><td>{state?.version ?? 0}</td><td>{state?.targeting_rules.length ?? 0}</td><td><div className="row-actions"><button className="text-button" onClick={() => setEditing(flag)}>Edit</button><button className="text-button" onClick={() => void archiveFlag(flag)}>Archive</button></div></td></tr>; })}</tbody></table>{!flags.length && <div className="empty-state"><h3>No flags yet</h3><p>Create a boolean, string, number, or JSON flag and configure it per environment.</p><button className="button button-primary" onClick={() => setShowCreate(true)}>Create your first flag</button></div>}</div></div>}

    {flags.map(flag => activeEnvironmentId && <RuleEditor key={`${flag.id}-${activeEnvironmentId}`} flag={flag} environmentId={activeEnvironmentId} segments={segments} onChanged={load} />)}

    {(showCreate || editing) && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) { setShowCreate(false); setEditing(null); } }}><div className="modal">
      {showCreate && <><div className="modal-header"><div><h2>Create a feature flag</h2><p>Start with a safe default. Environment rollout can be changed independently.</p></div><button className="icon-button" onClick={() => setShowCreate(false)}>×</button></div><form onSubmit={createFlag}><div className="modal-body form-grid"><div className="form-grid"><div className="field"><label>Key</label><input name="key" required pattern="[a-z0-9][a-z0-9_-]*" placeholder="new-checkout" /></div><div className="field"><label>Name</label><input name="name" required minLength={2} placeholder="New checkout experience" /></div><div className="field"><label>Description</label><textarea name="description" placeholder="What this flag controls" /></div><div className="field"><label>Type</label><select name="flag_type" defaultValue="boolean"><option value="boolean">Boolean</option><option value="string">String</option><option value="number">Number</option><option value="json">JSON</option></select></div><div className="field"><label>Default value</label><input name="default_value" placeholder="false, true, or a JSON value" /></div></div></div><div className="modal-footer"><button className="button button-ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Creating…" : "Create flag"}</button></div></form></>}
      {editing && <><div className="modal-header"><div><h2>Edit {editing.key}</h2><p>Change the flag label without changing its environment value.</p></div><button className="icon-button" onClick={() => setEditing(null)}>×</button></div><form onSubmit={saveFlag}><div className="modal-body form-grid"><div className="field"><label>Name</label><input name="name" defaultValue={editing.name} required /></div><div className="field"><label>Description</label><textarea name="description" defaultValue={editing.description || ""} /></div></div><div className="modal-footer"><button className="button button-ghost" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div></form></>}
    </div></div>}
  </div>;
}

function RuleEditor({ flag, environmentId, segments, onChanged }: { flag: FeatureFlag; environmentId: string; segments: Segment[]; onChanged: () => void }) {
  const [rules, setRules] = useState<TargetingRule[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [expanded, setExpanded] = useState(false); const [error, setError] = useState("");
  const state = flag.environment_states.find(s => s.environment_id === environmentId);
  useEffect(() => { let cancelled = false; api.get<TargetingRule[]>(`/flags/${flag.id}/environments/${environmentId}/rules`).then(r => { if (!cancelled) setRules(r); }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load rules"); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [flag.id, environmentId]);

  async function addRule() {
    setSaving(true); setError("");
    try { const created = await api.post<TargetingRule>(`/flags/${flag.id}/environments/${environmentId}/rules`, { name: `Rule ${rules.length + 1}`, conditions: [], segment_keys: [], rollout_percentage: null, serve_value: defaultValue(flag.flag_type), is_enabled: true }); setRules(prev => [...prev, created]); onChanged(); setExpanded(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to add rule"); }
    finally { setSaving(false); }
  }
  async function updateRule(rule: TargetingRule, patch: Partial<TargetingRule>) { setSaving(true); setError(""); try { const updated = await api.patch<TargetingRule>(`/rules/${rule.id}`, patch); setRules(prev => prev.map(x => x.id === updated.id ? updated : x)); onChanged(); } catch (err) { setError(err instanceof Error ? err.message : "Unable to update rule"); } finally { setSaving(false); } }
  async function deleteRule(rule: TargetingRule) { try { await api.delete(`/rules/${rule.id}`); setRules(prev => prev.filter(x => x.id !== rule.id)); onChanged(); } catch (err) { setError(err instanceof Error ? err.message : "Unable to delete rule"); } }

  return <div className="panel" style={{ marginTop: 12 }}><div className="panel-head"><div><strong>Targeting · {flag.key}</strong><div className="muted">{state?.enabled ? "Enabled" : "Disabled"} · default {displayJson(state?.default_value ?? defaultValue(flag.flag_type))}</div></div><div className="row-actions"><button className="text-button" onClick={() => setExpanded(!expanded)}>{expanded ? "Collapse" : "Configure"}</button><button className="button button-small button-dark" disabled={saving || !state?.enabled} onClick={() => void addRule()}>+ Rule</button></div></div>{expanded && <div className="panel-body">{error && <div className="error-box" style={{ marginBottom: 10 }}>{error}</div>}{loading ? <div className="loading">Loading targeting…</div> : rules.map(rule => <div className="panel" key={rule.id} style={{ marginBottom: 10, background: "#fbfbfa" }}><div className="panel-head"><div><strong>#{rule.priority} · {rule.name}</strong><div className="muted">{rule.rollout_percentage ? `${rule.rollout_percentage}% rollout` : "100% match"} · {rule.is_enabled ? "on" : "off"}</div></div><div className="row-actions"><button className="text-button" onClick={() => void updateRule(rule, { is_enabled: !rule.is_enabled })}>{rule.is_enabled ? "Disable" : "Enable"}</button><button className="icon-button" onClick={() => void deleteRule(rule)}>×</button></div></div><div className="modal-body form-grid"><div className="field"><label>Rule name</label><input value={rule.name} onChange={e => setRules(prev => prev.map(x=>x.id===rule.id?{...x,name:e.target.value}:x))} onBlur={() => void updateRule(rule, { name: rule.name })} /></div><div className="field"><label>Serve value</label><input value={valueForInput(rule.serve_value)} onChange={e => setRules(prev => prev.map(x=>x.id===rule.id?{...x,serve_value:parseJsonValue(e.target.value)}:x))} onBlur={() => void updateRule(rule, { serve_value: rule.serve_value })} /></div><div className="field"><label>Rollout percentage (blank = 100%)</label><input type="number" min="1" max="100" value={rule.rollout_percentage ?? ""} onChange={e => setRules(prev => prev.map(x=>x.id===rule.id?{...x,rollout_percentage:e.target.value?Number(e.target.value):null}:x))} onBlur={() => void updateRule(rule, { rollout_percentage: rule.rollout_percentage })} /></div><div className="field"><label>Segments</label><select multiple value={rule.segment_keys} onChange={e => void updateRule(rule, { segment_keys: Array.from(e.target.selectedOptions).map(o=>o.value) })}>{segments.map(segment => <option key={segment.key} value={segment.key}>{segment.name} ({segment.key})</option>)}</select></div><div className="field"><label>Conditions (all must match)</label><ConditionsEditor conditions={rule.conditions} onChange={next => { setRules(prev=>prev.map(x=>x.id===rule.id?{...x,conditions:next}:x)); void updateRule(rule,{conditions:next}); }} /></div></div></div>)}{!rules.length && <div className="notice">No rules yet. Add one to target users or introduce a controlled percentage rollout.</div>}</div>}</div>;
}
