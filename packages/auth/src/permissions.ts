import type { Role } from '@bushi/domain';

/** The discrete actions guarded across the Bushi platform. */
export const ACTIONS = [
  'tournament.create',
  'tournament.score',
  'school.manage',
  'org.invite',
  'admin.access',
] as const;

export type Action = (typeof ACTIONS)[number];

/**
 * Role -> allowed actions. `platform_admin` gets everything. This is a coarse
 * capability map; row-level ownership checks live in the API/domain layer.
 */
export const RolePermissions: Record<Role, readonly Action[]> = {
  platform_admin: [...ACTIONS],
  organizer: ['tournament.create', 'tournament.score', 'org.invite'],
  school_admin: ['school.manage', 'org.invite'],
  coach: ['school.manage'],
  referee: ['tournament.score'],
  scorekeeper: ['tournament.score'],
  competitor: [],
  spectator: [],
};

/** Whether `role` is permitted to perform `action`. */
export function can(role: Role, action: Action): boolean {
  return RolePermissions[role].includes(action);
}
