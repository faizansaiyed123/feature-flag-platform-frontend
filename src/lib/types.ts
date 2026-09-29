export type Role = "owner" | "admin" | "member" | "viewer";
export type FlagType = "boolean" | "string" | "number" | "json";

export interface User {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Membership {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: Role;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  key: string;
  description: string | null;
}

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  key: string;
  is_protected: boolean;
}

export interface EnvironmentKey {
  id: string;
  name: string;
  key_prefix: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
  sdk_key?: string;
}

export interface Condition {
  attribute: string;
  operator:
    | "equals"
    | "not_equals"
    | "in"
    | "not_in"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "greater_than"
    | "greater_than_or_equal"
    | "less_than"
    | "less_than_or_equal"
    | "exists";
  value?: unknown;
}

export interface TargetingRule {
  id: string;
  flag_environment_state_id: string;
  priority: number;
  name: string;
  conditions: Condition[];
  segment_keys: string[];
  rollout_percentage: number | null;
  serve_value: unknown;
  is_enabled: boolean;
}

export interface EnvironmentFlagState {
  id: string;
  environment_id: string;
  enabled: boolean;
  default_value: unknown;
  version: number;
  targeting_rules: TargetingRule[];
}

export interface FeatureFlag {
  id: string;
  project_id: string;
  key: string;
  name: string;
  description: string | null;
  flag_type: FlagType;
  is_archived: boolean;
  environment_states: EnvironmentFlagState[];
}

export interface Segment {
  id: string;
  project_id: string;
  key: string;
  name: string;
  description: string | null;
  conditions: Condition[];
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  actor_user_id: string | null;
  created_at: string;
}

export interface ProjectOverview {
  project_id: string;
  environments: number;
  flags: number;
  enabled_flags: number;
  segments: number;
  targeting_rules: number;
  recent_audit: AuditLog[];
}

export interface EvaluationResult {
  flag_key: string;
  value: unknown;
  reason: string;
  matched_rule_id: string | null;
  version: number;
}

export interface AuthResponse {
  user: User;
}
