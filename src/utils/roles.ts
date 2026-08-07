export function isPlatformAdmin(role?: string | null) {
  return role === 'Platform Admin' || role === 'Admin';
}

export function isGymOwner(role?: string | null) {
  return role === 'Gym Owner' || role === 'owner';
}

export function isGymStaff(role?: string | null) {
  return role === 'Front Desk' || role === 'Help Desk' || role === 'Gym Staff';
}

export function hasGymPortalAccess(role?: string | null) {
  return isGymOwner(role) || isGymStaff(role);
}

export const DEFAULT_STAFF_ROLE = 'Front Desk';

export const STAFF_ROLE_OPTIONS = [{ id: 'Front Desk', labelKey: 'roles.frontDesk' }] as const;
