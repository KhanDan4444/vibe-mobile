export function isPlatformAdmin(role?: string | null) {
  return role === 'Platform Admin' || role === 'Admin';
}

export function isGymOwner(role?: string | null) {
  return role === 'Gym Owner' || role === 'owner';
}

export function isGymStaff(role?: string | null) {
  return role === 'Help Desk' || role === 'Gym Staff';
}

export function hasGymPortalAccess(role?: string | null) {
  return isGymOwner(role) || isGymStaff(role);
}
