/** Roles, additive in capability: owner > agency > developer > client (scoped). */
export const ROLES = ["owner", "agency", "developer", "client"] as const;
export type Role = (typeof ROLES)[number];

/** Who performed an action — recorded on every applied change for the audit trail. */
export interface Actor {
  userId: string;
  role: Role;
  /** Display name/email for the audit log (never a secret). */
  label?: string;
}

/** Coarse capability gate. Real RBAC enforcement lives in the dashboard (Tier 3). */
export const ROLE_CAN_APPROVE: Record<Role, boolean> = {
  owner: true,
  agency: true,
  developer: false,
  client: false,
};

export function canApprove(role: Role): boolean {
  return ROLE_CAN_APPROVE[role];
}
