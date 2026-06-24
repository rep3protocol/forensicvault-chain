export const ROLES = [
  "ADMIN",
  "SUPERVISOR",
  "INVESTIGATOR",
  "EVIDENCE_CUSTODIAN",
  "VIEWER",
] as const;

export type UserRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  INVESTIGATOR: "Investigator",
  EVIDENCE_CUSTODIAN: "Evidence Custodian",
  VIEWER: "Viewer",
};

const ROLE_ALIASES: Record<string, UserRole> = {
  ADMIN: "ADMIN",
  Admin: "ADMIN",
  Administrator: "ADMIN",
  SUPERVISOR: "SUPERVISOR",
  Supervisor: "SUPERVISOR",
  INVESTIGATOR: "INVESTIGATOR",
  Investigator: "INVESTIGATOR",
  EVIDENCE_CUSTODIAN: "EVIDENCE_CUSTODIAN",
  "Evidence Custodian": "EVIDENCE_CUSTODIAN",
  Custodian: "EVIDENCE_CUSTODIAN",
  VIEWER: "VIEWER",
  Viewer: "VIEWER",
};

export type RoleResolution = {
  role: UserRole;
  recognized: boolean;
};

export function resolveRole(role: string | null | undefined): RoleResolution {
  if (!role || !role.trim()) {
    return { role: "INVESTIGATOR", recognized: false };
  }

  const trimmed = role.trim();

  if (ROLE_ALIASES[trimmed]) {
    return { role: ROLE_ALIASES[trimmed], recognized: true };
  }

  const normalized = trimmed.toUpperCase().replace(/\s+/g, "_");
  if ((ROLES as readonly string[]).includes(normalized)) {
    return { role: normalized as UserRole, recognized: true };
  }

  return { role: "INVESTIGATOR", recognized: false };
}

export function normalizeRole(role: string | null | undefined): UserRole {
  return resolveRole(role).role;
}

export function isRecognizedRole(role: string | null | undefined): boolean {
  return resolveRole(role).recognized;
}

export function roleLabel(role: string | null | undefined): string {
  return ROLE_LABELS[normalizeRole(role)];
}

export function hasRole(
  userRole: string | null | undefined,
  allowedRoles: readonly UserRole[],
): boolean {
  const normalized = normalizeRole(userRole);
  return allowedRoles.includes(normalized);
}

export function isUserRole(value: string): value is UserRole {
  return (ROLES as readonly string[]).includes(value);
}
