export type SecurityRole = "owner" | "admin" | "member" | "guest";
export type ResourceType = "project" | "task" | "document" | "member" | "billing" | "workspace" | "automation" | "integration" | "form";
export type SecurityAction = "read" | "write" | "delete" | "admin" | "billing";

export interface PermissionMatrix {
  role: SecurityRole;
  description: string;
  grants: Partial<Record<ResourceType, SecurityAction[]>>;
}

export const PERMISSION_MATRIX: PermissionMatrix[] = [
  {
    role: "owner",
    description: "Full access to all resources and settings",
    grants: {
      project: ["read", "write", "delete"],
      task: ["read", "write", "delete"],
      document: ["read", "write", "delete"],
      member: ["read", "write", "delete"],
      billing: ["read", "write", "delete"],
      workspace: ["read", "write", "delete"],
      automation: ["read", "write", "delete"],
      integration: ["read", "write", "delete"],
      form: ["read", "write", "delete"],
    },
  },
  {
    role: "admin",
    description: "Administrative access, cannot delete workspace or modify billing owners",
    grants: {
      project: ["read", "write", "delete"],
      task: ["read", "write", "delete"],
      document: ["read", "write", "delete"],
      member: ["read", "write", "delete"],
      billing: ["read", "write"],
      workspace: ["read", "write"],
      automation: ["read", "write", "delete"],
      integration: ["read", "write", "delete"],
      form: ["read", "write", "delete"],
    },
  },
  {
    role: "member",
    description: "Workspace participation, can create/edit resources but not manage billing or workspace settings",
    grants: {
      project: ["read", "write"],
      task: ["read", "write", "delete"],
      document: ["read", "write", "delete"],
      member: ["read"],
      billing: ["read"],
      workspace: ["read"],
      automation: ["read", "write"],
      integration: ["read"],
      form: ["read", "write"],
    },
  },
  {
    role: "guest",
    description: "Limited read-only access with scoped write permissions",
    grants: {
      project: ["read"],
      task: ["read", "write"],
      document: ["read"],
      member: ["read"],
      billing: [],
      workspace: ["read"],
      automation: [],
      integration: [],
      form: [],
    },
  },
];

export const SENSITIVE_ACTIONS: string[] = [
  "Project deletion",
  "User removal",
  "Billing changes",
  "Permission modifications",
  "Workspace deletion",
  "Integration credential management",
];

export const AUDIT_LOGGING_REQUIREMENTS: string[] = [
  "Record who performed the action",
  "Record when the action happened",
  "Record what changed",
  "Record the previous state",
  "Record the result of the action",
];

export const DATA_PROTECTION_RULES: string[] = [
  "Nova must protect user data from unauthorized access",
  "Nova must minimize data exposure to only what is necessary",
  "Nova must avoid unnecessary data retention",
  "Nova must respect privacy controls set by users and admins",
];

export const AI_SECURITY_RULES: string[] = [
  "Nova must never invent permissions",
  "Nova must never access restricted data",
  "Nova must never reveal private information",
  "Nova must never ignore access controls",
];

export const SECURITY_PRIORITY_ORDER: string[] = [
  "Security",
  "Reliability",
  "Functionality",
  "Convenience",
];

export function getRolePermissions(role: SecurityRole): PermissionMatrix | undefined {
  return PERMISSION_MATRIX.find(p => p.role === role);
}

export function hasPermission(role: SecurityRole, resource: ResourceType, action: SecurityAction): boolean {
  const matrix = getRolePermissions(role);
  if (!matrix?.grants[resource]) return false;
  return matrix.grants[resource]!.includes(action);
}
