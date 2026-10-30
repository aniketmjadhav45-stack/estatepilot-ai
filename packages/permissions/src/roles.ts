export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_OWNER: 'org_owner',
  ORG_ADMIN: 'org_admin',
  BRANCH_MANAGER: 'branch_manager',
  TEAM_LEAD: 'team_lead',
  SENIOR_AGENT: 'senior_agent',
  AGENT: 'agent',
  SUPPORT_STAFF: 'support_staff',
} as const;

export type RoleCode = typeof ROLES[keyof typeof ROLES];
